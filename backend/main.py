import os
import tempfile
import json
import re
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pypdf
from openai import OpenAI
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="APL Comparison API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = OpenAI()

# Store processing status
processing_tasks = {}

# Reduce token usage to stay within rate limits
maxtokens = 4000
max_words = 3000

# # Function to truncate text to reduce token usage
# def truncate_for_api(text, max_length=3000):
#     """Truncate text to reduce token usage while preserving important parts."""
#     if len(text) <= max_length:
#         return text
    
#     # Take the first third and the last third of the content
#     first_part = text[:max_length // 2]
#     last_part = text[-max_length // 2:]
    
#     return first_part + "\n\n[...content truncated...]\n\n" + last_part


def extract_text_from_pdf(pdf_file: str) -> str:
    """Extract text content from a PDF file."""
    try:
        with open(pdf_file, 'rb') as file:
            reader = pypdf.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            logger.info(f"Extracted text from PDF: {pdf_file}")
            return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error extracting text from PDF: {str(e)}")

def extract_apl_info(filename):
    """Extract APL number and year from filename."""
    match = re.search(r'APL(\d{2})-(\d{3})', filename, re.IGNORECASE)
    if match:
        year_prefix = int(match.group(1))
        apl_number = match.group(1) + '-' + match.group(2)
        # Determine century based on year prefix
        year = f"19{year_prefix}" if year_prefix > 50 else f"20{year_prefix}"
        return {
            "apl_number": apl_number,
            "year": year,
            "citation_key": f"APL{match.group(1)}"
        }
    return None

async def process_apl_comparison(
    old_apl_path: str, 
    new_apl_path: str, 
    validated_old_apl_path: str,
    validated_new_apl_path: str,
    validated_diff_path: str,
    task_id: str,
    old_apl_filename: str,
    new_apl_filename: str,
    quick_mode: bool,
    model: str,
):
    """Process the APL comparison using OpenAI's o3 model."""
    try:
        # Extract text from PDFs
        old_apl_text = extract_text_from_pdf(old_apl_path)
        new_apl_text = extract_text_from_pdf(new_apl_path)
        validated_old_apl_text = extract_text_from_pdf(validated_old_apl_path)
        validated_new_apl_text = extract_text_from_pdf(validated_new_apl_path)
        
        # Read validated diff JSON
        with open(validated_diff_path, 'r') as f:
            validated_diff_json = f.read()
        
        # Extract APL info from filenames
        old_apl_info = extract_apl_info(old_apl_filename)
        new_apl_info = extract_apl_info(new_apl_filename)
        
        if not old_apl_info or not new_apl_info:
            raise HTTPException(status_code=400, detail="Invalid APL filenames. Expected format: APLxx-xxx.pdf")
        
        # Step 3: Generate initial diff JSON
        logger.info(f"Task {task_id}: Generating initial diff JSON")
        logger.info(f"Quick mode: {quick_mode}")

        initial_diff_response = await generate_initial_diff(
            old_apl_text, 
            new_apl_text, 
            validated_old_apl_text,
            validated_new_apl_text,
            validated_diff_json,
            old_apl_info,
            new_apl_info,
            model
        )
        
        if quick_mode:
            # In quick mode, we skip the estimate and final diff steps
            logger.info(f"Task {task_id}: Quick mode enabled, skipping estimate and final diff steps")
            final_diff = initial_diff_response
        else:
            # Step 5: Generate new APL estimate
            logger.info(f"Task {task_id}: Generating new APL estimate")
            new_apl_estimate = await generate_new_apl_estimate(
                old_apl_text,
                initial_diff_response,
                model
            )
            
            # Step 6: Generate final diff JSON
            logger.info(f"Task {task_id}: Generating final diff JSON")
            final_diff = await generate_final_diff(
                new_apl_text,
                new_apl_estimate,
                initial_diff_response,  
                model
            )
        
        # Step 7: Score changes
        logger.info(f"Task {task_id}: Scoring changes")
        scored_diff = await score_and_categorize_changes(final_diff, model)
        
        # Update task status
        processing_tasks[task_id] = {
            "status": "completed",
            "json": scored_diff
        }
        
    except Exception as e:
        logger.error(f"Error in APL comparison task {task_id}: {str(e)}")
        processing_tasks[task_id] = {
            "status": "failed",
            "error": str(e)
        }

async def generate_initial_diff(
    old_apl_text: str, 
    new_apl_text: str, 
    validated_old_apl_text: str,
    validated_new_apl_text: str,
    validated_diff_json: str,
    old_apl_info: dict,
    new_apl_info: dict,
    model: str
) -> str:
    """Generate initial diff JSON using OpenAI's model."""
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", 
                "content": ("You are a senior healthcare‑policy analyst who prepares executive‑level change "
                    "briefs for health‑plan Compliance Officers.  Your job is to compare two All Plan "
                    "Letters (APLs) and produce a rigorously structured JSON report that:\n"
                    "• Focuses ONLY on changes that can alter obligations, benefits, eligibility, "
                    "deadlines, reporting, oversight, or enforcement.\n"
                    "• Ignores purely editorial or cosmetic edits (see Ignore List).\n"
                    "• Provides exact page‑and‑line citations so a Compliance Officer can open the PDF "
                    "immediately to the right spot.\n"
                    "Answer in valid JSON only.")
                },
                {"role": "user", "content": f"""
                I'm providing you with two pairs of APL documents:
                
                1. A validated example:
                   - Old APL: {validated_old_apl_text}...
                   - New APL: {validated_new_apl_text}...
                   - Difference JSON: {validated_diff_json}...
                
                2. The pair I want you to analyze:
                   - Old APL: {old_apl_text}...
                   - New APL: {new_apl_text}...
                
                Please analyze the second pair of documents and create a detailed JSON document that highlights the key differences between them. 
                Follow the EXACT same format and structure as the validated example difference JSON.
                Only include "meaninful" changes:
                Definition of “meaningful” vs “ignore”  

                    **Include a change only if at least one of these is true (Compliance‑Relevant):**

                    * • Alters covered populations, benefits, services, or exclusions  
                    * • Adds or deletes reporting, documentation, or audit requirements  
                    * • Changes monetary amounts (rates, penalties, copays, funding)  
                    * • Modifies timelines, effective dates, or frequency of tasks  
                    * • Introduces, changes, or removes an enforcement or sanction mechanism  
                    * • Redefines terms or roles *in a way that shifts responsibility or scope*  
                    * • References new or rescinded statutes, regulations, or external guidance  
                    * • Adds new operational procedures, clinical protocols, or data standards

                    **Ignore List (DO NOT capture):**

                    * • Formatting or style guidance (fonts, italics, bolding, citation style)  
                    * • Renaming of internal DHCS job titles *unless* duties materially shift  
                    * • Section renumbering, header wording that does not change substance  
                    * • Grammar fixes, punctuation, capitalization, hyphenation, typographical clean‑ups  
                    * • Boilerplate notices (e.g., “Removed italics call‑out” or “Revised text now in plain font”)  
                    * • Purely administrative address/phone/email updates with no policy effect

                
                The JSON should include:
                1. A title field with the APL numbers and dates
                2. A summary field explaining the overall changes
                3. Categories section with three arrays: Additions, Updates, and Redactions
                   - Additions: New content in the new APL (include citations from new APL only)
                   - Updates: Content that exists in both but has changed (include citations from both old and new APL)
                   - Redactions: Content removed from the old APL (include citations from old APL only)
                4. Each item should have a "bullet" field with a full description of the change and a "citations" field with page and line numbers
                    - Make sure each description is very clear and lists the full change, be descriptive!
                5. A conclusion field summarizing the impact of the changes
                
                For citations, use the following keys:
                - For the old APL: "{old_apl_info['citation_key']}"
                - For the new APL: "{new_apl_info['citation_key']}"
                
                When referring to years in the summary or elsewhere, use:
                - Old APL year: {old_apl_info['year']}
                - New APL year: {new_apl_info['year']}
                
                For each change, provide precise citations with page and line numbers.
                Make sure the citations line up with the actual location of the start of the context in the pdf.
                    -Double check each citation to make sure the page/line number is correct on its respecitve pdf.

                Format text with ** for bold and * for italic when appropriate.
                Make sure the output is valid JSON that can be parsed by a JSON parser.
                """}
            ],
           # temperature=0,
           # max_tokens=maxtokens,
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error generating initial diff: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating initial diff: {str(e)}")

async def generate_new_apl_estimate(old_apl_text: str, initial_diff_json: str, model: str) -> str:
    """Generate an estimate of the new APL based on the old APL and initial diff JSON."""
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are an expert in healthcare policy analysis, specifically for All Plan Letters (APLs). Your task is to generate an estimate of a new APL document based on an old APL document and a diff JSON."},
                {"role": "user", "content": f"""
                I'm providing you with:
                
                1. An old APL document (was once a pdf but got converted to a string via pypdf): {old_apl_text}...
                2. A diff JSON that describes the changes from the old APL to a new APL: {initial_diff_json}
                
                Based on these inputs, please generate an estimate of what the new APL document would look like.
                Use the old APL as a base and apply the changes described in the diff JSON.
                Maintain the same structure, formatting, and style as the old APL.
                - The goal is to compare this new APL estimate to the actual new APL to see if we missed any changes.
                - So try to make it as if it were a pdf converted to string via pypdf (what the old APL was)
                Include page and line numbers in your output to match the citations in the diff JSON.
                """}
            ],
           # temperature=0,
           # max_tokens=maxtokens
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error generating new APL estimate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating new APL estimate: {str(e)}")

async def generate_final_diff(new_apl_text: str, new_apl_estimate: str, initial_diff_json: str, model: str) -> str:
    """Generate the final diff JSON by comparing the actual new APL with the estimated one."""
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", 
                "content": "You are a senior healthcare‑policy analyst who prepares change digests "
                    "for Health‑Plan Compliance Officers.  Your mission is to merge three "
                    "inputs—the *actual* new APL, an *estimated* draft APL, and an *initial* "
                    "diff JSON—into one **final, comprehensive** diff JSON."
                    "Focus ONLY on changes that affect obligations, benefits, timelines, "
                    "reporting, enforcement, or statutory references.  Ignore purely editorial "
                    "or cosmetic edits (see Ignore List below).  Provide exact page‑and‑line "
                    "citations so a compliance officer can verify every bullet.  Output valid "
                    "JSON only."},
                {"role": "user", "content": f"""
                I am giving you three items:

                1. **Actual new APL**  
                {new_apl_text}…

                2. **Estimated draft APL**  
                {new_apl_estimate}…

                3. **Initial diff JSON**  
                {initial_diff_json}

                ---

                ### Task
                1. Compare the **actual** new APL to the **estimated** draft.  
                2. Identify *missing or incorrect* bullets in the initial diff JSON.  
                3. Produce a **final diff JSON** in the *exact* schema of the initial diff, with:
                • All valid bullets from the initial diff \
                    **plus** any newly detected Additions, Updates, or Redactions.  
                • Accurate page & line citations for **every** bullet.  

                ---

                ### Definition of a "meaningful" change (include if *any* apply)
                * Alters covered populations, benefits, services, or exclusions  
                * Adds/deletes reporting, documentation, audit, or data requirements  
                * Changes dollar amounts, penalties, or funding mechanisms  
                * Modifies timelines, effective dates, or frequency of tasks  
                * Introduces/changes/removes enforcement or sanction language  
                * Redefines roles **in a way that shifts responsibility or scope**  
                * References new or rescinded statutes, regulations, or external guidance  
                * Adds operational, clinical, or data‑standard procedures

                ### Ignore List (DO NOT capture)
                * Formatting/style choices (fonts, italics, bold, citation style)  
                * Pure title renames without duty change  
                * Section renumbering, grammar fixes, punctuation, typographical cleanup  
                * Boilerplate like "revised text in italics" notifications  
                * Administrative address/phone/email updates with no policy effect

                ---
                The JSON should include:
                1. A title field with the APL numbers and dates
                2. A summary field explaining the overall changes
                3. Categories section with three arrays: Additions, Updates, and Redactions
                   - Additions: New content in the new APL (include citations from new APL only)
                   - Updates: Content that exists in both but has changed (include citations from both old and new APL)
                   - Redactions: Content removed from the old APL (include citations from old APL only)
                4. Each item should have a "bullet" field with a full description of the change and a "citations" field with page and line numbers
                    - Make sure each description is very clear and lists the full change, be descriptive!
                5. A conclusion field summarizing the impact of the changes
                
                For citations, use the same citation format as the initial diff JSON.
                
                
                When referring to years in the summary or elsewhere, use the same year as the initial diff JSON.
              
                
                For each change, provide precise citations with page and line numbers.
                Make sure the citations line up with the actual location of the start of the context in the pdf.
                    -Double check each citation to make sure the page/line number is correct on its respecitve pdf.

                Format text with ** for bold and * for italic when appropriate.
                Make sure the output is valid JSON that can be parsed by a JSON parser.
                """
                    }
                ],
           # temperature=0,
           # max_tokens=maxtokens,
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error generating final diff: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating final diff: {str(e)}")

async def score_and_categorize_changes(diff_json: str, model: str) -> str:
    """Score each change on a scale of 1-10 ."""
    try:
        # Parse the diff JSON if it's a string
        diff_data = json.loads(diff_json) if isinstance(diff_json, str) else diff_json
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", 
                "content": "You are a senior healthcare‑policy analyst who scores policy changes on their significance. "
                    "Your task is to evaluate each change in a diff JSON and score it on a scale of 1-10, where 1 is not meaningful "
                    "and 10 is extremely meaningful. Maintain the original change type (Addition, Update, or Redaction) "
                    "for each item. Output valid JSON only."},
                {"role": "user", "content": f"""
                I'm providing you with a diff JSON that describes changes between two APL documents:
                
                {json.dumps(diff_data, indent=2)}
                
                Please score each change on a scale of 1-10 based on the following criteria:

                ### Definition of a "meaningful" change (score higher if more apply)
                * Alters covered populations, benefits, services, or exclusions  
                * Adds/deletes reporting, documentation, audit, or data requirements  
                * Changes dollar amounts, penalties, or funding mechanisms  
                * Modifies timelines, effective dates, or frequency of tasks  
                * Introduces/changes/removes enforcement or sanction language  
                * Redefines roles **in a way that shifts responsibility or scope**  
                * References new or rescinded statutes, regulations, or external guidance  
                * Adds operational, clinical, or data‑standard procedures

                ### Ignore List (score lower if these are the only changes)
                * Formatting/style choices (fonts, italics, bold, citation style)  
                * Pure title renames without duty change  
                * Section renumbering, grammar fixes, punctuation, typographical cleanup  
                * Boilerplate like "revised text in italics" notifications  
                * Administrative address/phone/email updates with no policy effect
                
                In general, try to score changes based on their impact on a health plan trying to comply with the APL.
                Think about actual changes that will require work to maintain regulatory alignment.
                Think about changes that have actual operational impact. 
                In addition, at this step, try to see if any changes are not meaningful enough to include,
                or if they overlap with another change, and those two can be merged.
                    -In the case of a merge, delete both of the existing bullets and replace them with a new bullet:
                        -the new bullet should have fresh title logic, fresh scoring, and default to the earlier citation if there is a citation on the same document. 
                
                For each change, add a "score" field with the numeric score (1-10) 

                The output JSON should have the following structure:
                1. A title field with the APL numbers and dates
                2. A summary field explaining the overall changes
                3. A conclusion field summarizing the impact of the changes
                4. A bullets field with an array of bullet objects
                (title: "", summary: "", bullets: [], conclusion:"")


                within each bullet, it should be structued as:
                (bullet_title: "", bullet_content: "", score: int, revision_type: "addition" | "update" | "redaction", citations: ())

                citations should look like: 
                "citations": ("APL25": ("page": 3,"line": 12), "APL21": null)
                "citations": ("APL21": ("page": 13,"line": 2), "APL18": ("page": 1,"line": 23))
               

                Each item should have:
                1. All the original fields (bullet, citations)
                    -make sure each bullet has a fitting brief title in the title field
                    -the bullet_content should be the main content of the bullet.
                2. A "score" field with the numeric score (1-10)
                3. A "type" field with the original category (Addition, Update, or Redaction)
                
                -NOTE: Bullets should be sorted by score, highest to lowest.
                Make sure the output is valid JSON that can be parsed by a JSON parser.
                """
                }
            ],
            response_format={"type": "json_object"}
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error scoring and categorizing changes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error scoring and categorizing changes: {str(e)}")

@app.post("/api/compare")
async def compare_apls(
    background_tasks: BackgroundTasks,
    old_apl: UploadFile = File(...),
    new_apl: UploadFile = File(...),
    quick_mode: str = Form(default="false"),
    model: str = Form(default="gpt-4.1"),
    view_mode: str = Form(default="significance")
):
    # Debug logging
    logger.info(f"Received quick_mode parameter: '{quick_mode}'")
    logger.info(f"Received model parameter: '{model}'")
    logger.info(f"Received view_mode parameter: '{view_mode}'")
    
    """
    Compare two APL files and return the differences in markdown format.
    
    This endpoint accepts two PDF files:
    - old_apl: The predecessor APL file
    - new_apl: The new APL file
    
    It returns a task ID that can be used to check the status of the comparison.
    """
    # Create a unique task ID
    task_id = f"{old_apl.filename}_{new_apl.filename}"
    
    # Initialize task status
    processing_tasks[task_id] = {"status": "processing"}
    
    try:
        # Create temporary files for the uploaded PDFs
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as old_temp, \
             tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as new_temp:
            
            # Write uploaded files to temporary files
            old_temp.write(await old_apl.read())
            new_temp.write(await new_apl.read())
            
            # Get paths to validated example files
            current_dir = os.path.dirname(os.path.abspath(__file__))
            parent_dir = os.path.dirname(current_dir)
            validated_old_apl_path = os.path.join(parent_dir, "APL13-014.pdf")
            validated_new_apl_path = os.path.join(parent_dir, "APL25-008.pdf")
            validated_diff_path = os.path.join(parent_dir, "Diff_13-014_25-008 copy.json")
            
            # Verify that the validated files exist
            for file_path in [validated_old_apl_path, validated_new_apl_path, validated_diff_path]:
                if not os.path.exists(file_path):
                    raise HTTPException(status_code=500, detail=f"Validated file not found: {file_path}")
            
            # Convert quick_mode string to boolean
            # Default to False if quick_mode is None
            if quick_mode is None:
                quick_mode_bool = False
                logger.info("No quick_mode parameter received, defaulting to False")
            else:
                quick_mode_bool = quick_mode.lower() == "true"
            
            # Start background task for processing
            background_tasks.add_task(
                process_apl_comparison,
                old_temp.name,
                new_temp.name,
                validated_old_apl_path,
                validated_new_apl_path,
                validated_diff_path,
                task_id,
                old_apl.filename,
                new_apl.filename,
                quick_mode_bool,
                model,
            )
            
            return {"task_id": task_id, "status": "processing"}
    
    except Exception as e:
        logger.error(f"Error processing APL comparison: {str(e)}")
        processing_tasks[task_id] = {"status": "failed", "error": str(e)}
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status/{task_id}")
async def get_task_status(task_id: str):
    """
    Check the status of an APL comparison task.
    
    This endpoint accepts a task ID and returns the status of the task.
    If the task is completed, it also returns the JSON result.
    """
    if task_id not in processing_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_info = processing_tasks[task_id]
    
    if task_info["status"] == "failed":
        return {"status": "failed", "error": task_info.get("error", "Unknown error")}
    
    if task_info["status"] == "completed":
        return {"status": "completed", "json": task_info["json"]}
    
    return {"status": "processing"}

@app.get("/")
async def root():
    return {"message": "APL Comparison API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
