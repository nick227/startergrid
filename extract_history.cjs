const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\9b3a3165-1379-40d9-97ba-ff3d7288261f\\.system_generated\\logs\\transcript.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      // Let's look for VIEW_FILE or REPLACE_FILE_CONTENT targeting our file
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
           if (tc.name === 'default_api:view_file') {
             // It doesn't contain the file content directly in the call, but the response does.
           }
        }
      }
      if (obj.type === 'VIEW_FILE_RESPONSE' || (obj.type === 'TOOL_CALL_RESPONSE' && line.includes('platformAccountService.ts') && line.includes('File Path'))) {
          if (line.includes('platformAccountService.ts')) {
              // try to extract the code
              // console.log(obj.content);
          }
      }
      // Let's just look at any tool call response that contains the file path and "import type { PrismaClient"
      if (obj.type === 'TOOL_CALL_RESPONSE' && obj.content && obj.content.includes('import type { PrismaClient') && obj.content.includes('platformAccountService.ts')) {
          console.log("FOUND IT");
          fs.writeFileSync('C:\\wamp64\\www\\auto-dealer-sales-portal\\src\\services\\publishing\\platformAccountService_old.ts', obj.content);
          return;
      }

    } catch (e) {}
  }
}

processLineByLine();
