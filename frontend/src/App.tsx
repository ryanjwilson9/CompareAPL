import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'

import { Button } from './components/ui/button'
import { FileUpload } from './components/ui/file-upload'
import { Spinner } from './components/ui/spinner'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card'
import { Switch } from './components/ui/switch'
import { Label } from './components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { CitationPreview } from './components/CitationPreview'

interface ChangeTypeChipProps {
  type: 'Addition' | 'Update' | 'Redaction'
  className?: string
}

const ChangeTypeChip = ({ type, className = '' }: ChangeTypeChipProps) => {
  const bgColor = 
    type.toLowerCase() === 'addition' ? 'bg-green-500' :
    type.toLowerCase() === 'update' ? 'bg-blue-500' :
    'bg-red-500';

  const icon = 
    type.toLowerCase() === 'addition' ? '+' :
    type.toLowerCase() === 'update' ? '↻' :
    '×';

  return (
    <span className={`inline-flex items-center justify-center rounded-full ${bgColor} text-white px-2 py-1 text-xs font-medium ${className}`}>
      {icon}
    </span>
  );
};

// Helper function to extract year from APL filename (e.g., APL13-014.pdf -> 2013)
const getYearFromAPL = (filename?: string): string => {
  if (!filename) return 'N/A';
  
  // Extract the first part of the APL number (e.g., "13" from "APL13-014.pdf")
  const match = filename.match(/APL(\d{2})-\d{3}/i);
  if (match && match[1]) {
    const yearPrefix = parseInt(match[1]);
    // Determine century based on year prefix
    return yearPrefix > 50 ? `19${yearPrefix}` : `20${yearPrefix}`;
  }
  return 'N/A';
};

// Helper function to get the citation key based on APL filename
const getAPLCitationKey = (filename?: string): string => {
  if (!filename) return '';
  
  // Extract the APL number (e.g., "13" from "APL13-014.pdf")
  const match = filename.match(/APL(\d{2})/i);
  if (match && match[1]) {
    return `APL${match[1]}`;
  }
  return '';
};

// // Helper function to render formatted text (bold and italic)
// const renderBulletPoint = (bullet: string) => {
//   // Extract title (text wrapped in **)
//   const titleMatch = bullet.match(/^\*\*(.+?)\*\*/)
//   const title = titleMatch ? titleMatch[1] : '';
  
//   // Get the rest of the text after the title
//   const description = titleMatch
//     ? bullet.slice(titleMatch[0].length).trim()
//     : bullet;

//   return { title, description };
// };

const renderFormattedText = (text: string) => {
  // Handle italic text (wrapped in *)
  const italicParts = text.split('*')
  return (
    <>
      {italicParts.map((part, i) => {
        if (i % 2 === 1) {
          // This part should be italic
          return <em key={i}>{part}</em>;
        } else {
          return <span key={i}>{part}</span>;
        }
      })}
    </>
  );
};

function App() {
  const [oldAPL, setOldAPL] = useState<File | null>(null)
  const [newAPL, setNewAPL] = useState<File | null>(null)
  const [diffJson, setDiffJson] = useState<any>(null)
  const [jsonA, setJsonA] = useState<any>(null)
  const [jsonB, setJsonB] = useState<any>(null)
  const [jsonC, setJsonC] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('Uploading files...')
  const [quickMode, setQuickMode] = useState<boolean>(true) // false = Full Process, true = Quick Mode
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4.1')
  const [viewMode, setViewMode] = useState<string>('significance')
  const oldAPLRef = useRef<HTMLInputElement>(null)
  const newAPLRef = useRef<HTMLInputElement>(null)
  const pollingIntervalRef = useRef<number | null>(null)

  // Effect to switch between different JSON views
  useEffect(() => {
    if (!jsonA || !jsonB || !jsonC) return;
    
    switch (viewMode) {
      case 'significance':
        setDiffJson(jsonA);
        break;
      case 'page':
        setDiffJson(jsonB);
        break;
      case 'revision':
        setDiffJson(jsonC);
        break;
      default:
        setDiffJson(diffJson);  // Default to significance view
        break;
    }
  }, [viewMode, jsonA, jsonB, jsonC]);

  // Poll for task status when taskId is set
  useEffect(() => {
    if (taskId && loading) {
      const pollStatus = async () => {
        try {
          const response = await axios.get(`http://localhost:8000/api/status/${taskId}`)
          const { status, json, error: taskError } = response.data
          
          if (status === 'completed') {
            try {
              const parsedJson = typeof json === 'string' ? JSON.parse(json) : json;
              
              // Set all JSON versions first
              setJsonA(parsedJson);
              
              // Create page-sorted version
              const pageSorted = [...parsedJson.bullets].sort((a: any, b: any) => {
                const pick = (item: any) => {
                  const oldKey = getAPLCitationKey(oldAPL?.name);
                  const newKey = getAPLCitationKey(newAPL?.name);
                  if (item.revision_type === 'addition')
                    return item.citations?.[newKey] ?? {};
                  if (item.revision_type === 'redaction')
                    return item.citations?.[oldKey] ?? {};
                  return item.citations?.[newKey] ?? item.citations?.[oldKey] ?? {};
                };
                const ca = pick(a);
                const cb = pick(b);
                const pageA = ca.page ?? Infinity;
                const pageB = cb.page ?? Infinity;
                if (pageA !== pageB) return pageA - pageB;
                const lineA = ca.line ?? Infinity;
                const lineB = cb.line ?? Infinity;
                return lineA - lineB;
              });
              const pageJson = { ...parsedJson, bullets: pageSorted };
              setJsonB(pageJson);
              
              // Create revision-sorted version
              const revisionSorted = [...parsedJson.bullets].sort((a: any, b: any) => {
                const rank: Record<string, number> = { addition: 0, update: 1, redaction: 2 };
                const rA = rank[a.revision_type.toLowerCase()] ?? 99;
                const rB = rank[b.revision_type.toLowerCase()] ?? 99;
                if (rA !== rB) return rA - rB;
                return (b.score ?? 0) - (a.score ?? 0);
              });
              const revisionJson = { ...parsedJson, bullets: revisionSorted };
              setJsonC(revisionJson);
              
              // // Set initial view based on viewMode
              // switch (viewMode) {
              //   case 'significance':
              //     setDiffJson(parsedJson);
              //     break;
              //   case 'revision':
              //     setDiffJson(pageJson);
              //     break;
              //   case 'page':
              //     setDiffJson(revisionJson);
              //     break;
              //   default:
              //     setDiffJson(parsedJson);
              // }

              //   const byPageThenLine = (a: any, b: any) => {
              //     const pick = (item: any) => {
              //       const oldKey = getAPLCitationKey(oldAPL?.name);
              //       const newKey = getAPLCitationKey(newAPL?.name);
  
              //       if (item.revision_type === 'addition')
              //         return item.citations?.[newKey] ?? {};
              //       if (item.revision_type === 'redaction')
              //         return item.citations?.[oldKey] ?? {};
              //       return item.citations?.[newKey] ?? item.citations?.[oldKey] ?? {};
              //     };
              //     const ca = pick(a);
              //     const cb = pick(b);
              //     const pageA = ca.page ?? Infinity;
              //     const pageB = cb.page ?? Infinity;
              //     if (pageA !== pageB) return pageA - pageB;
              //     const lineA = ca.line ?? Infinity;
              //     const lineB = cb.line ?? Infinity;
              //     return lineA - lineB;
              //   };
              //   return [...diffJson.bullets].sort(byPageThenLine);
              // }, [viewMode, diffJson.bullets]);
              // setJsonB(pagejson)

              // const revisionjson = React.useMemo(() => {
              //     const rank: Record<string, number> = { addition: 0, update: 1, redaction: 2 };
        
              //     return [...diffJson.bullets].sort((a, b) => {
              //       const rA = rank[a.revision_type] ?? 99;
              //       const rB = rank[b.revision_type] ?? 99;
              //       if (rA !== rB) return rA - rB;
              //       return (b.score ?? 0) - (a.score ?? 0);
              //     });
              // }, [viewMode, diffJson.bullets]);

              // setJsonC(revisionjson)  
              setLoading(false)
              setTaskId(null)
              clearInterval(pollingIntervalRef.current as unknown as number)
              pollingIntervalRef.current = null
            } catch (parseError) {
              console.error('Error parsing JSON:', parseError);
              setError('Error parsing the comparison results. Please try again.');
              setLoading(false);
              setTaskId(null);
              clearInterval(pollingIntervalRef.current as unknown as number);
              pollingIntervalRef.current = null;
            }
          } else if (status === 'failed') {
            setError(taskError || 'An error occurred during processing')
            setLoading(false)
            setTaskId(null)
            clearInterval(pollingIntervalRef.current as unknown as number)
            pollingIntervalRef.current = null
          } else {
            // Update progress message based on time elapsed
            if (progress === 'Uploading files...') {
              setProgress('Analyzing APL documents...')
            } else if (progress === 'Analyzing APL documents...') {
              if (quickMode) {
                setProgress('Generating differences...')
              } else {
                setProgress('Generating initial differences...')
              }
            } else if (!quickMode && progress === 'Generating initial differences...') {
              setProgress('Creating APL estimate...')
            } else if (!quickMode && progress === 'Creating APL estimate...') {
              setProgress('Finalizing comparison results...')
            }
          }
        } catch (err) {
          console.error('Error polling task status:', err)
          setError('Error checking task status. Please try again.')
          setLoading(false)
          setTaskId(null)
          clearInterval(pollingIntervalRef.current as unknown as number)
          pollingIntervalRef.current = null
        }
      }

      // Poll every 5 seconds
      pollingIntervalRef.current = setInterval(pollStatus, 5000) as unknown as number
      
      // Initial poll
      pollStatus()

      // Cleanup interval on unmount
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current as unknown as number)
          pollingIntervalRef.current = null
        }
      }
    }
  }, [taskId, loading, progress])

  const handleOldAPLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setOldAPL(e.target.files[0])
      setError('')
    }
  }

  const handleNewAPLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewAPL(e.target.files[0])
      setError('')
    }
  }

  const resetForm = () => {
    setOldAPL(null)
    setNewAPL(null)
    setDiffJson(null)
    setJsonA(null)
    setJsonB(null)
    setJsonC(null)
    setError('')
    setTaskId(null)
    setProgress('Uploading files...')
    if (oldAPLRef.current) oldAPLRef.current.value = ''
    if (newAPLRef.current) newAPLRef.current.value = ''
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current as unknown as number)
      pollingIntervalRef.current = null
    }
  }

  const handleSubmit = async () => {
    if (!oldAPL || !newAPL) {
      setError('Please upload both APL files')
      return
    }

    setLoading(true)
    setError('')
    setProgress('Uploading files...')
    setDiffJson(null)
    setJsonA(null)
    setJsonB(null)
    setJsonC(null)

    const formData = new FormData()
    formData.append('old_apl', oldAPL)
    formData.append('new_apl', newAPL)
    formData.append('quick_mode', quickMode.toString())
    formData.append('model', selectedModel)
    
    // Log the form data for debugging
    console.log('Submitting form with quick_mode:', quickMode ? 'false' : 'true')

    try {
      const response = await axios.post('http://localhost:8000/api/compare', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.task_id) {
        setTaskId(response.data.task_id)
        setProgress('Analyzing APL documents...')
      } else {
        throw new Error('No task ID returned from server')
      }
    } catch (err) {
      console.error('Error comparing APLs:', err)
      setError('An error occurred while uploading the APL files. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Healthcare APL Comparison Tool</h1>
          <p className="text-muted-foreground">Upload two APL files to see the differences between them</p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Old APL</CardTitle>
              <CardDescription>Upload the predecessor APL file</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload 
                ref={oldAPLRef}
                onChange={handleOldAPLChange}
                accept="application/pdf"
                description="Upload PDF file"
              />
              {oldAPL && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selected: {oldAPL.name}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>New APL</CardTitle>
              <CardDescription>Upload the new APL file</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload 
                ref={newAPLRef}
                onChange={handleNewAPLChange}
                accept="application/pdf"
                description="Upload PDF file"
              />
              {newAPL && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selected: {newAPL.name}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex gap-4">
            <Button onClick={handleSubmit} disabled={loading || !oldAPL || !newAPL}>
              {loading ? <Spinner size="sm" className="mr-2" /> : null}
              Compare APLs
            </Button>
            <Button variant="outline" onClick={resetForm} disabled={loading}>
              Reset
            </Button>
          </div>
          <div className="flex justify-between items-center mb-4 px-4 gap-5">
            <div className="flex items-center space-x-2">
              <Label htmlFor="model-select">Model:</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="o3">o3</SelectItem>

                </SelectContent>
              </Select>
            </div>
              <div className="flex items-center space-x-2">
              <Label htmlFor="model-select">Sort by:</Label>
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select=l" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="significance">Significance</SelectItem>
                  <SelectItem value="revision">Revision Type</SelectItem>
                  <SelectItem value="page">Page</SelectItem>

                </SelectContent>
              </Select>
            </div>
          
          <div className="flex items-center space-x-2">
              <Switch 
                id="quick-mode" 
                checked={quickMode} 
                onCheckedChange={setQuickMode} 
                disabled={loading}
              />
              <Label htmlFor="quick-mode" className="cursor-pointer">
                {quickMode ? 
                    "Quick Mode":
                    "Full Process"}
                </Label>
              </div>
        </div>
        </div>

        {loading && (
          <Card className="mb-8">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Spinner size="lg" className="mb-4" />
              <p className="text-center text-muted-foreground">
                {progress}<br />
                This may take a few minutes as we process the documents.
              </p>
            </CardContent>
          </Card>
        )}

        {diffJson && !loading && (
          <Card>
            <CardHeader>
              <CardTitle>
                {/* Format the title to match the requested format */}
                {diffJson.title ? (
                  diffJson.title
                    .replace('Comprehensive Difference Matrix — ', '')
                    .replace(/\((\w+ )(\d+)(\s+)(\d+)\)/g, '($1$2, $4)')
                ) : 'APL Differences'}
              </CardTitle>
              <CardDescription className="whitespace-pre-line">
                {diffJson.summary ? (
                  <>
                    {/* First part of the summary before Additions */}
                    {diffJson.summary.split('**Additions**')[0]}
                    
                    {/* Format the categories on separate lines */}
                    <div className="mt-2">
                      <p>
                        <span className="scale-75 inline-block transform-gpu">
                          <ChangeTypeChip type="Addition" className="mr-2" />
                        </span>
                        <strong>Additions</strong> (entirely new in {getYearFromAPL(newAPL?.name)})
                      </p>
                      <p>
                        <span className="scale-75 inline-block transform-gpu">
                          <ChangeTypeChip type="Update" className="mr-2" />
                        </span>
                        <strong>Updates</strong> ({getYearFromAPL(oldAPL?.name)} language materially rewritten or expanded)
                      </p>
                      <p>
                        <span className="scale-75 inline-block transform-gpu">
                          <ChangeTypeChip type="Redaction" className="mr-2" />
                        </span>
                        <strong>Redactions</strong> (requirements present in {getYearFromAPL(oldAPL?.name)} that disappear in {getYearFromAPL(newAPL?.name)})
                      </p>
                    </div>
                  </>
                ) : null}
              </CardDescription>
            </CardHeader>

            {/* Set diffJson to jsonA, jsonB, or jsonC depending on viewMode */}
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              {diffJson.bullets.length > 0 && (
                <div className="mb-8">
                  <div className="space-y-4">
                    {diffJson.bullets.map((item: any, index: number) => {
                      return (
                        <div key={`tier1-${index}`} className="pl-4 py-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <ChangeTypeChip type={item.revision_type} className="mr-2" />
                              <strong>{item.bullet_title}</strong>
                            </div>
                            <span className="text-sm bg-gray-200 text-gray-800 px-2 py-1 rounded-full whitespace-nowrap ml-4">
                              Score: {item.score}/10
                            </span>
                          </div>
                          <div className="text-gray-600 pl-8">
                            {renderFormattedText(item.bullet_content)}
                          </div>
                          
                          {/* Citations based on change type with hover preview */}
                          {item.revision_type.toLowerCase() === 'addition' && item.citations?.[getAPLCitationKey(newAPL?.name)] && (
                            <div className="text-sm mt-2 pl-8">
                              <CitationPreview 
                                citation={item.citations[getAPLCitationKey(newAPL?.name)]}
                                documentName={newAPL?.name || ''}
                              />
                            </div>
                          )}
                          
                          {item.revision_type.toLowerCase() === 'update' && (
                            <div className="text-sm mt-2 pl-8">
                              {item.citations?.[getAPLCitationKey(oldAPL?.name)] && (
                                <div className="mb-1">
                                  <CitationPreview 
                                    citation={item.citations[getAPLCitationKey(oldAPL?.name)]}
                                    documentName={oldAPL?.name || ''}
                                  />
                                </div>
                              )}
                              {item.citations?.[getAPLCitationKey(newAPL?.name)] && (
                                <div>
                                  <CitationPreview 
                                    citation={item.citations[getAPLCitationKey(newAPL?.name)]}
                                    documentName={newAPL?.name || ''}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                          
                          {item.revision_type.toLowerCase() === 'redaction' && item.citations?.[getAPLCitationKey(oldAPL?.name)] && (
                            <div className="text-sm mt-2 pl-8">
                              <CitationPreview 
                                citation={item.citations[getAPLCitationKey(oldAPL?.name)]}
                                documentName={oldAPL?.name || ''}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              
              
              {/* Conclusion */}
              {diffJson.conclusion && (
                <div className="mt-8 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                  <h2 className="text-xl font-bold mb-2">Conclusion</h2>
                  <p>{diffJson.conclusion}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => {
                const blob = new Blob([JSON.stringify(diffJson, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `Diff_${oldAPL?.name.replace('.pdf', '')}_${newAPL?.name.replace('.pdf', '')}.json`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
              }}>
                Download JSON
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App
