<CardContent className="prose prose-sm max-w-none dark:prose-invert">
              {diffJson.bullets.length > 0 && (
                <div className="mb-8">
                  <div className="space-y-4">
                    {diffJson.bullets.map((item: any, index: number) => {
                      return (
                        // <div key={`bullet-${index}`} className="pl-4 py-2">
                        //   <div className="flex items-center justify-between mb-2">
                        //     <div className="flex items-center">
                        //       <ChangeTypeChip type={item.type} className="mr-2" />
                        //       <strong>{renderBulletPoint(item.bullet).title}</strong>
                            </div>
                            <span className="text-sm bg-gray-200 text-gray-800 px-2 py-1 rounded-full whitespace-nowrap ml-4">
                              Score: {item.score}/10
                            </span>
                          </div>
                          <div className="text-gray-600 pl-8">
                            {renderFormattedText(renderBulletPoint(item.bullet).description)}
                          </div>
                          
                          {/* Citations based on change type */}
                          {item.type === 'Addition' && item.citations?.[getAPLCitationKey(newAPL?.name)] && (
                            <div className="text-sm text-gray-500 mt-2">
                              {`${newAPL?.name.replace('.pdf', '')}: Page ${item.citations[getAPLCitationKey(newAPL?.name)].page}, Line ${item.citations[getAPLCitationKey(newAPL?.name)].line}`}
                            </div>
                          )}
                          
                          {item.type === 'Update' && (
                            <div className="text-sm text-gray-500 mt-2">
                              <div>{oldAPL?.name.replace('.pdf', '')}: Page {item.citations?.[getAPLCitationKey(oldAPL?.name)]?.page || 'N/A'}, Line {item.citations?.[getAPLCitationKey(oldAPL?.name)]?.line || 'N/A'}</div>
                              <div>{newAPL?.name.replace('.pdf', '')}: Page {item.citations?.[getAPLCitationKey(newAPL?.name)]?.page || 'N/A'}, Line {item.citations?.[getAPLCitationKey(newAPL?.name)]?.line || 'N/A'}</div>
                            </div>
                          )}
                          
                          {item.type === 'Redaction' && item.citations?.[getAPLCitationKey(oldAPL?.name)] && (
                            <div className="text-sm text-gray-500 mt-2">
                              {`${oldAPL?.name.replace('.pdf', '')}: Page ${item.citations[getAPLCitationKey(oldAPL?.name)].page}, Line ${item.citations[getAPLCitationKey(oldAPL?.name)].line}`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}







              {/* Tier 2 Section - Medium Impact Changes */}
              {diffJson.categories?.Tier2?.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4">Tier 2 - Medium Impact Changes</h2>
                  <div className="space-y-4">
                    {diffJson.categories.Tier2.map((item: any, index: number) => {
                      return (
                        <div key={`tier2-${index}`} className="pl-4 py-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <ChangeTypeChip type={item.type} className="mr-2" />
                              <strong>{renderBulletPoint(item.bullet).title}</strong>
                            </div>
                            <span className="text-sm bg-gray-200 text-gray-800 px-2 py-1 rounded-full whitespace-nowrap ml-4">
                              Score: {item.score}/10
                            </span>
                          </div>
                          <div className="text-gray-600 pl-8">
                            {renderFormattedText(renderBulletPoint(item.bullet).description)}
                          </div>
                          
                          {/* Citations based on change type */}
                          {item.type === 'Addition' && item.citations?.[getAPLCitationKey(newAPL?.name)] && (
                            <div className="text-sm text-gray-500 mt-2">
                              {`${newAPL?.name.replace('.pdf', '')}: Page ${item.citations[getAPLCitationKey(newAPL?.name)].page}, Line ${item.citations[getAPLCitationKey(newAPL?.name)].line}`}
                            </div>
                          )}
                          
                          {item.type === 'Update' && (
                            <div className="text-sm text-gray-500 mt-2">
                              <div>{oldAPL?.name.replace('.pdf', '')}: Page {item.citations?.[getAPLCitationKey(oldAPL?.name)]?.page || 'N/A'}, Line {item.citations?.[getAPLCitationKey(oldAPL?.name)]?.line || 'N/A'}</div>
                              <div>{newAPL?.name.replace('.pdf', '')}: Page {item.citations?.[getAPLCitationKey(newAPL?.name)]?.page || 'N/A'}, Line {item.citations?.[getAPLCitationKey(newAPL?.name)]?.line || 'N/A'}</div>
                            </div>
                          )}
                          
                          {item.type === 'Redaction' && item.citations?.[getAPLCitationKey(oldAPL?.name)] && (
                            <div className="text-sm text-gray-500 mt-2">
                              {`${oldAPL?.name.replace('.pdf', '')}: Page ${item.citations[getAPLCitationKey(oldAPL?.name)].page}, Line ${item.citations[getAPLCitationKey(oldAPL?.name)].line}`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Tier 3 Section - Low Impact Changes */}
              {diffJson.categories?.Tier3?.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4">Tier 3 - Low Impact Changes</h2>
                  <div className="space-y-4">
                    {diffJson.categories.Tier3.map((item: any, index: number) => {
                      return (
                        <div key={`tier3-${index}`} className="pl-4 py-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <ChangeTypeChip type={item.type} className="mr-2" />
                              <strong>{renderBulletPoint(item.bullet).title}</strong>
                            </div>
                            <span className="text-sm bg-gray-200 text-gray-800 px-2 py-1 rounded-full whitespace-nowrap ml-4">
                              Score: {item.score}/10
                            </span>
                          </div>
                          <div className="text-gray-600 pl-8">
                            {renderFormattedText(renderBulletPoint(item.bullet).description)}
                          </div>
                          
                          {/* Citations based on change type */}
                          {item.type === 'Addition' && item.citations?.[getAPLCitationKey(newAPL?.name)] && (
                            <div className="text-sm text-gray-500 mt-2">
                              {`${newAPL?.name.replace('.pdf', '')}: Page ${item.citations[getAPLCitationKey(newAPL?.name)].page}, Line ${item.citations[getAPLCitationKey(newAPL?.name)].line}`}
                            </div>
                          )}
                          
                          {item.type === 'Update' && (
                            <div className="text-sm text-gray-500 mt-2">
                              <div>{oldAPL?.name.replace('.pdf', '')}: Page {item.citations?.[getAPLCitationKey(oldAPL?.name)]?.page || 'N/A'}, Line {item.citations?.[getAPLCitationKey(oldAPL?.name)]?.line || 'N/A'}</div>
                              <div>{newAPL?.name.replace('.pdf', '')}: Page {item.citations?.[getAPLCitationKey(newAPL?.name)]?.page || 'N/A'}, Line {item.citations?.[getAPLCitationKey(newAPL?.name)]?.line || 'N/A'}</div>
                            </div>
                          )}
                          
                          {item.type === 'Redaction' && item.citations?.[getAPLCitationKey(oldAPL?.name)] && (
                            <div className="text-sm text-gray-500 mt-2">
                              {`${oldAPL?.name.replace('.pdf', '')}: Page ${item.citations[getAPLCitationKey(oldAPL?.name)].page}, Line ${item.citations[getAPLCitationKey(oldAPL?.name)].line}`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Fallback for old format - in case the backend hasn't been updated */}
              {(!diffJson.categories?.Tier1 && !diffJson.categories?.Tier2 && !diffJson.categories?.Tier3) && (
                <>
                  {/* Additions Section */}
                  {diffJson.categories?.Additions?.length > 0 && (
                    <div className="mb-8">
                      <h2 className="text-xl font-bold mb-4">Additions</h2>
                      <div className="space-y-4">
                        {diffJson.categories.Additions.map((item: any, index: number) => (
                          <div key={`addition-${index}`} className="pl-4 py-2">
                            <div className="font-semibold mb-2">
                              <ChangeTypeChip type="Addition" className="mr-2" />
                              <strong>{renderBulletPoint(item.bullet).title}</strong>
                            </div>
                            <div className="mt-2 text-gray-600">
                              {renderFormattedText(renderBulletPoint(item.bullet).description)}
                            </div>
                            {item.citations?.[getAPLCitationKey(newAPL?.name)] && (
                              <div className="text-sm text-gray-500 mt-2">
                                {`${newAPL?.name.replace('.pdf', '')}: Page ${item.citations[getAPLCitationKey(newAPL?.name)].page}, Line ${item.citations[getAPLCitationKey(newAPL?.name)].line}`}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Updates Section */}
                  {diffJson.categories?.Updates?.length > 0 && (
                    <div className="mb-8">
                      <h2 className="text-xl font-bold mb-4">Updates</h2>
                      <div className="space-y-4">
                        {diffJson.categories.Updates.map((item: any, index: number) => (
                          <div key={`update-${index}`} className="pl-4 py-2">
                            <div className="font-semibold mb-2">
                              <ChangeTypeChip type="Update" className="mr-2" />
                              <strong>{renderBulletPoint(item.bullet).title}</strong>
                            </div>
                            <div className="mt-2 text-gray-600">
                              {renderFormattedText(renderBulletPoint(item.bullet).description)}
                            </div>
                            <div className="text-sm text-gray-500 mt-2">
                              {/* Always show both old and new APL citations for Updates section */}
                              <div>{oldAPL?.name.replace('.pdf', '')}: Page {item.citations?.[getAPLCitationKey(oldAPL?.name)]?.page || 'N/A'}, Line {item.citations?.[getAPLCitationKey(oldAPL?.name)]?.line || 'N/A'}</div>
                              <div>{newAPL?.name.replace('.pdf', '')}: Page {item.citations?.[getAPLCitationKey(newAPL?.name)]?.page || 'N/A'}, Line {item.citations?.[getAPLCitationKey(newAPL?.name)]?.line || 'N/A'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Redactions Section */}
                  {diffJson.categories?.Redactions?.length > 0 && (
                    <div className="mb-8">
                      <h2 className="text-xl font-bold mb-4">Redactions</h2>
                      <div className="space-y-4">
                        {diffJson.categories.Redactions.map((item: any, index: number) => (
                          <div key={`redaction-${index}`} className="pl-4 py-2">
                            <div className="font-semibold mb-2">
                              <ChangeTypeChip type="Redaction" className="mr-2" />
                              <strong>{renderBulletPoint(item.bullet).title}</strong>
                            </div>
                            <div className="mt-2 text-gray-600">
                              {renderFormattedText(renderBulletPoint(item.bullet).description)}
                            </div>
                            {item.citations?.[getAPLCitationKey(oldAPL?.name)] && (
                              <div className="text-sm text-gray-500 mt-2">
                                {`${oldAPL?.name.replace('.pdf', '')}: Page ${item.citations[getAPLCitationKey(oldAPL?.name)].page}, Line ${item.citations[getAPLCitationKey(oldAPL?.name)].line}`}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>)}