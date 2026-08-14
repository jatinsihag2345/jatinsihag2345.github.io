import fs from 'fs';

const id = '46108c6b-d459-4f7f-94af-37837b9fe4bb';
const logPath = `/Users/jatinsihag/.gemini/antigravity/brain/${id}/.system_generated/logs/transcript.jsonl`;

const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

lines.forEach((line, index) => {
  if (!line.trim()) return;
  try {
    const step = JSON.parse(line);
    console.log(`Step ${index}: Type=${step.type}`);
    if (step.tool_calls && Array.isArray(step.tool_calls)) {
      step.tool_calls.forEach(tc => {
        console.log(`  Tool: ${tc.name}`);
        const argsObj = tc.args || tc.arguments;
        if (argsObj) {
          console.log(`  Args keys: ${Object.keys(argsObj).join(', ')}`);
          Object.entries(argsObj).forEach(([k, v]) => {
            console.log(`    Key: ${k}, Type: ${typeof v}, Length: ${String(v).length}`);
            if (typeof v === 'string') {
              console.log(`    Value snippet: ${v.substring(0, 100)}`);
              // Let's try parsing it
              try {
                const parsed = JSON.parse(v);
                console.log(`      Parsed type: ${typeof parsed}`);
                if (typeof parsed === 'object' && parsed !== null) {
                  console.log(`      Parsed keys: ${Object.keys(parsed).slice(0, 5).join(', ')}`);
                } else if (typeof parsed === 'string') {
                  console.log(`      Parsed string snippet: ${parsed.substring(0, 100)}`);
                  try {
                    const parsed2 = JSON.parse(parsed);
                    console.log(`        Parsed2 type: ${typeof parsed2}`);
                    if (typeof parsed2 === 'object' && parsed2 !== null) {
                      console.log(`        Parsed2 keys: ${Object.keys(parsed2).slice(0, 5).join(', ')}`);
                    }
                  } catch (e) {
                    console.log(`        Parsed2 failed: ${e.message}`);
                  }
                }
              } catch (e) {
                console.log(`      Parsed failed: ${e.message}`);
              }
            }
          });
        }
      });
    }
  } catch (e) {
    console.log(`Step ${index} Parse error: ${e.message}`);
  }
});
