import fs from 'fs';

const ids = [
  '055aed5a-35b0-4b94-9bfd-0b71c22484f5',
  '46108c6b-d459-4f7f-94af-37837b9fe4bb',
  'dbc40fd8-bb13-41ba-a771-39f9a64e08b8',
  '40992b73-1fa5-44c9-85bd-eb6e85449078',
  'd65b279a-ace2-4d72-93fa-35f43819b702',
  '3051e497-ae21-49e7-a3b3-2e963bac03c5',
  '4933992b-2dd0-497c-b1a9-4d74d094845c',
  '8e2340bc-1150-4126-9dbc-97bc44894325'
];

ids.forEach(id => {
  const path = `/Users/jatinsihag/.gemini/antigravity/brain/${id}/.system_generated/logs/transcript.jsonl`;
  if (fs.existsSync(path)) {
    const stats = fs.statSync(path);
    console.log(`ID: ${id} - EXISTS, Size: ${stats.size} bytes`);
  } else {
    console.log(`ID: ${id} - DOES NOT EXIST`);
  }
});
