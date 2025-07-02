          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm font-medium">AI Model:</label>
            <select
              value={selectedLLM}
              onChange={(e) => setSelectedLLM(e.target.value)}
              className="flex-1 px-3 py-1 rounded-md border bg-background"
              disabled={isResearching}
            >
              <option value="claude-sonnet-4">Claude Sonnet 4 (Recommended)</option>
              <option value="gpt-4">GPT-4</option>
              <option value="claude-3">Claude 3</option>
            </select>
          </div>