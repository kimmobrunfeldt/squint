#!/bin/bash

PORT_1=23010
PORT_2=23011

# Case 1
ts-node tools/httpServer.ts -p $PORT_1 test/resources/case1/ &
PID=$!

ts-node src/index.ts screenshot http://localhost:$PORT_1/old -o test/resources/case1/img/screenshot/old.png
ts-node src/index.ts screenshot http://localhost:$PORT_1/new -o test/resources/case1/img/screenshot/new.png
ts-node src/index.ts screenshot http://localhost:$PORT_1/new --selector 'h1' -o test/resources/case1/img/screenshot/old-h1.png
ts-node src/index.ts screenshot http://localhost:$PORT_1/new --selector-js '(page) => page.$("h1")' -o test/resources/case1/img/screenshot/old-h1-js.png
ts-node src/index.ts compare http://localhost:$PORT_1/old http://localhost:$PORT_1/new --single-page -o test/resources/case1/img/compare/diff.png

kill $PID

# Case 2
ts-node tools/httpServer.ts -p $PORT_1 test/resources/case2/old &
PID=$!

ts-node tools/httpServer.ts -p $PORT_2 test/resources/case2/new &
PID2=$!

ts-node src/index.ts compare http://localhost:$PORT_1 http://localhost:$PORT_2 --out-dir test/resources/case2/img/compare --save-all

kill $PID
kill $PID2
