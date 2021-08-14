#!/bin/bash

# Case 1
ts-node tools/httpServer.ts -p 10000 test/resources/case1/ &
PID=$!

ts-node src/index.ts screenshot http://localhost:10000/old -o test/resources/case1/img/screenshot/old.png
ts-node src/index.ts screenshot http://localhost:10000/new -o test/resources/case1/img/screenshot/new.png
ts-node src/index.ts screenshot http://localhost:10000/new --selector 'h1' -o test/resources/case1/img/screenshot/old-h1.png
ts-node src/index.ts screenshot http://localhost:10000/new --selector-js '(page) => page.$("h1")' -o test/resources/case1/img/screenshot/old-h1-js.png
ts-node src/index.ts compare http://localhost:10000/old http://localhost:10000/new --single-page -o test/resources/case1/img/compare/diff.png

kill $PID

# Case 2
ts-node tools/httpServer.ts -p 10000 test/resources/case2/old &
PID=$!

ts-node tools/httpServer.ts -p 10001 test/resources/case2/new &
PID2=$!

ts-node src/index.ts compare http://localhost:10000 http://localhost:10001 --out-dir test/resources/case2/img/compare --save-all

kill $PID
kill $PID2
