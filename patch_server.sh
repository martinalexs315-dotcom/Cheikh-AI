sed -i '/let evidenceSummary = "";/,/}/d' server.ts
sed -i 's/${evidenceSummary}//g' server.ts
sed -i 's/evidenceList = sourcesList;/evidenceList = [];/g' server.ts
