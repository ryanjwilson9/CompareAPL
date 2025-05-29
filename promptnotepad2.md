Help me create a web app with React, Tailwind, Shadcn, Vite, and FastAPI.

The goal of this app is to return differences of a new healthcare APL and its predecessor APL. 

The app should have a file upload feature that allows the user to upload two PDF files, 
one for the new APL and one for the predecessor APL. 
The app should then return the differences between the two APLs (in markdown)

Currently I have one validated example (validated triple): 
Old APL: APL13-014.PDF
New APL: APL25-008.PDF
Differences: Diff__13-014_25-008.json

Id like to use OpenAI's gpt-4o model to generate a json in similar format to the validated example,
and then we display this on the web app. 

The web app should have a clean, modern, and user-friendly interface. (Add a loading spinner while the model is loading)

Here is the generating process for returning a final difference json:

1. User uploads two PDF files APL{old}.pdf and APL{new}.pdf, one for the new APL and one for the predecessor APL.
2. We plug these 2 files, as well as our validated triple into the gpt-4o model as context
3. We prompt the gpt-4o model to look create a difference json for the 2 new APLs, in a similar format to the validated triple. This should give us Diff_initial__{old}_{new}.json
4. This is the first draft of the difference json. We should not display this on the web app.
5. Now plug Diff_initial__{old}_{new}.json and APL{old}.pdf into gpt-4o model to generate an estimate of {new}_estimate.pdf (can be in markdown, json, or pdf- whichever you think would work best)
6. Now we plug in APL{new}.pdf, {new}_estimate.pdf, and Diff_initial__{old}_{new}.json into gpt-4o model to see what our new estimate missed with the initial draft- add these extra changes to diff_{old}_{new}.json, our final difference json
7. Display diff_{old}_{new}.json on the web app

lsof -i -P -n | grep LISTEN | grep node
lsof -i -P | grep LISTEN





I'd like to make a few changes to this codebase:
1. convert markdown to JSON
2. add citations to each change

Let's break these down in more detail. 

Before this we were using markdown for the diff files (diff_13-014_25-008.md), which represents the changes from APL13-014 to APL25-008. We then created a diff_initial_old_new.md file, which represents the initial draft of the difference markdown. And then we created a diff_13-014_25-008.md file, which represents the final difference markdown. 

I've added in a new diff file in the json format (diff_13-014_25-008.json), which represents the differences in json format, and includes citations for each change. With similar logic, I'd like to make the initial draft of the difference into a json format (diff_initial_old_new.json). And then we can use the same logic to create a final difference json file (diff_13-014_25-008.json). 

The citations are denoted by page and line number. So when we create the diff_initial_old_new.json, we should include citations in a similar format. And similarly when creating the final diff_old_new.json

More specifically, we break up the JSON into 3 main sections:
1.Additions : include citation from new APL
2.Updates : include citations from both old and new APL
3.Redactions : include citation from old APL


This will involve structural changes, and significantly alter our prompts for the model calls. Right now we are prompting it to return markdown files, and we instead want to return json files. 

Based on the json file, we then want to display it on the frontend in a readable format. 

I've attached a screenshot of what I'd like the sample json to render like. Make sure the jsons that are passed through are in a similar format to our sample json, and then we can use a universal logic to parse all of the json files similarly. 

 Text that is wrapped with ** should be bold, and text that is wrapped with * should be italic. Additionally, each bullet point starts off with a bolded text, lets make that on its own line, and start the description on the next line. Another change: For additions and redactions, we mark the citation something like "Citation: Page 17, Line 10". For Updates, we mark it something like "Old: Page 17, Line 10; New: Page 18, Line 5". Lets change both of these to be something descriptive like "APL25-008: Page 17, Line 10" or "APL13-014: Page 1, Line 3". 
Additionally, in the summary heading we have "The matrix below groups the changes into **Additions** (entirely new in 2025), **Updates** (2013 language materially rewritten or expanded) and **Redactions** (requirements present in 2013 that disappear in 2025)". lets make these on new lines properly so that it is cleaner.  




Great, a few fixes. First change the title from "Comprehensive Difference Matrix — APL 25‑007 (April 25 2025) vs. APL 23‑012 (December 4 2023)" to "APL 25‑007 (April, 25, 2025) vs. APL 23‑012 (December, 4, 2023)"

Next, the conclusion box is blacked out (screenshot). Don't make it a different color. 

Next, the updates section only has one citation per bullet. It should have one for each APL



once we have our final json, I'd like to call o3 one more time to score each change. Use a similar system prompt as ours earlier where we binary-classed things as meaningful : 

                "Definition of a “meaningful” change (include if *any* apply)
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
                * Boilerplate like “revised text in italics” notifications  
                * Administrative address/phone/email updates with no policy effect"....

But now we want to score on a scale of 1-10, where 1 is not meaningful and 10 is very meaningful. 

This should also render differently. I'd like it to be categorized into 3 tiers of change significance. It should have a similar format as now, except instead of being grouped by "additions", "updates", and "redactions", it should be grouped by "Tier 1", "Tier 2", and "Tier 3".  Each bullet point should still have a small icon next to it indicating it is an addition (a green +), update (a blue double circular arrow ), or redaction (a red X). 

Your changes will primarily include adding a new call within backend/main.py and also changing the rendering of this. 



Ok a few changes:

1. Right now we denote the addition/update/redaction based on a little logo next to the bullet point and a green/blue/red line on the very left. I'd like to change this to be denoted by a chip instead. On the chip i'd like it to be the a white "+" sign with green background, a white double circular arrow (see attachment) with blue background, or a white "X" with red background.

2. In addtition up top we have a summary that includes the key: Additions (entirely new in 2025)
Updates (2021 language materially rewritten or expanded)
Redactions (requirements present in 2021 that disappear in 2025)

I'd like to add the same chips to these as well. 


Ok great. Now i'd like one more dropdown toggle. Once we have the output of the model, I'd like the user to be able to toggle between dispalying the information sorted by "Significance" (current), sorted by "Revision Type" (additions, updates, redactions), or sorted by "Page" (sorted by page/ line number).

The current rendering process is made for the "Significance" toggle, so we need to make an additional rendering process for these two new options. I'd like it to be Similar format, each bullet point still including the chip and score, but now grouped differently:
- For "revision type": group by  (additions, updates, redactions)
    It should also be sorted by significance, with the highest significance bullet points at the top. 

- For "Page": no grouping
    - there should be no sorting by significance.


The drop down should say "Sort by:" and have three options: "Significance" and "Revision Type" and "Page". 



Clarifying Questions:

For the Page view:
If an item has citations from both old and new APL files, which should we use for sorting?
    - we should use the page/line number from the new APL file.
If an item has multiple line numbers (e.g., spans multiple lines), which line number should we use for sorting?
    - we should use the page/line number from the new APL file.
How should we handle items that don't have page/line citations?
    - in the case of the page view, place them at the end
For the Revision Type view:
Should we show the tier information anywhere in this view, or just the score?
    - we should not show the tier information, just the score.
Should we show any visual separation between high/medium/low significance items within each revision type group?
    - we should not show any visual separation.
General:
Should the sorting preference persist across different uploads/comparisons?
    the default preference should be signficance.
Should we maintain the current quick/full mode distinction for all view types?
    yes

Also note- I want this toggle to be distinct from the generation of the diff json. we should be able to run the diff json generation process, and it should render in the selected format. But then, without re-running the diff json generation process, we should be able to change the dropdown selected format, and it should automatically re-render the diff json in the selected format. 


Additional Questions:

For the Page View:
When sorting by page/line, should we show the page/line numbers prominently in the UI for each item?
    - we should show the page/line numbers prominently in the UI for each item.
For items that don't have citations (placed at the end), should they be sorted by significance or just appear in their original order?
    - we should sort them by significance.
For all views:
Should we maintain the same visual hierarchy for each bullet point (chip → title → score → description), or should the layout adapt based on the view type?
    - we should maintain the same visual hierarchy for each bullet point.
For the score display (currently "Score: X/10"), should this format be consistent across all views?
    - we should maintain the same score display format.
UI/UX Questions:
Should the dropdown be placed next to the Quick/Full mode toggle, or somewhere else in the UI?
    Yes, next to the quick/full mode toggle.
When switching views, should we add any transition effects, or make it an instant switch?
    -you can try to do an animated transition
Should we show a loading state while re-rendering large datasets?
    -yes



I am thinking of adding in a feature that allows the user to hover over the citations, and a small preview box pops up with the text displayed from the citation. This would require a lot of reworking, completely restructuring the json carrying over. 

I've made a change to the json format, but only within the citations.
Prior:      "citations": ("APL25": ("page": 3,"line": 12), "APL21": null)
                "citations": ("APL21": ("page": 13,"line": 2), "APL18": ("page": 1,"line": 23))                
           
New:
      "citations": ("APL25": ("page": 3,"line": 12, "text": "..."), "APL21": null)
     "citations": ("APL21": ("page": 13,"line": 2, "text": "..."), "APL18": ("page": 1,"line": 23, "text": "..."))                
           
Note that the only differnce is the addition of the "text" field within the citation object. 

So on the rendering side, show me some changes you'd make to the code to allow for this new feature. I believe it should all be in App.tsx, unless we need to make a new component. Do not implement anything yet, just give me an implementation plan. 