#!/bin/bash

# Case 1
http-server -p 10000 test/resources/case1/ &
PID=$!

npm run squint -- screenshot http://localhost:10000/old -o test/resources/case1/img/screenshot/old.png
npm run squint -- screenshot http://localhost:10000/new -o test/resources/case1/img/screenshot/new.png
npm run squint -- compare http://localhost:10000/old http://localhost:10000/new --single-page -o test/resources/case1/img/compare/diff.png

kill $PID

# Case 2
http-server -p 10000 test/resources/case2/old &
PID=$!

http-server -p 10001 test/resources/case2/new &
PID2=$!

npm run squint -- compare http://localhost:10000 http://localhost:10001 --out-dir test/resources/case2/img/compare --save-all

kill $PID
kill $PID2
