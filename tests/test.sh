input=$1
# if sort -R doesn't shuffle, try "shuf". If neither works, replace with "cat"
alias shuffle="sort -R"
if [ "x$input" == "x" ]; then
    files1=$(cat words-v1 2> /dev/null | shuffle)
    files2=$(cat words-cs words-v2 2> /dev/null | shuffle)
else
    read -r firstline < $input.in
    if [[ "x$firstline" == "xVERSION:2" ]]; then
	files2=$input
    else
	files1=$input
    fi
fi
BLUE="[0;34m"
NORMAL="[0m"
URL=$TEST_URL
if [ "x$URL"  == "x" ]; then 
    URL=http://localhost:3001
fi
fail=0
for FILE in $files2; do
    echo ${BLUE}${FILE}${NORMAL}
    curl -X POST -s  "${URL}/game/set_up_board?gid=test1&board=$(node test.js ./$FILE.in)" > .$FILE.test;
    # this is not an underscore
    tr "_ " "  " <  $FILE.out  > .$FILE.out-x
    tr "_ " "  " < .$FILE.test > .$FILE.test-x
    colordiff -wub -U 30 .$FILE.out-x .$FILE.test-x || { echo ""; >&2 echo "error in $FILE"; fail=1; }
    rm .$FILE.test .$FILE.out-x .$FILE.test-x 
done
for FILE in $files1; do
    echo ${BLUE}${FILE}${NORMAL}
    curl -X POST -s  "${URL}/game/set_up_board?gid=auto1&board=$(node test.js ./$FILE.in)" > .$FILE.test;
    tr "_ " "  " <  $FILE.out  > .$FILE.out-x
    tr "_ " "  " < .$FILE.test > .$FILE.test-x
    colordiff -wub -U 30 .$FILE.out-x .$FILE.test-x || { echo ""; >&2 echo "error in $FILE"; fail=1; }
    rm -f .$FILE.test .$FILE.out-x .$FILE.test-x
done


exit $fail
