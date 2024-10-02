input=$1
files1=$1
if [[ "x$input" == "x" ]]; then files1=$(cat words-v1); files2=$(cat words-v2); fi
BLUE="[0;34m"
NORMAL="[0m"
URL=http://localhost:3001
fail=0
for FILE in $files2; do
    echo ${BLUE}${FILE}${NORMAL}
    curl -X POST -s  "${URL}/game/set_up_board?gid=test1&board=$(node test.js ./$FILE.in)" > .$FILE.test;
    # this is not an underscore
    tr "_" " " <  $FILE.out  > .$FILE.out-x
    tr "_" " " < .$FILE.test > .$FILE.test-x
    colordiff -wub -U 10 .$FILE.out-x .$FILE.test-x || { echo ""; >&2 echo "error in $FILE"; fail=1; }
    rm .$FILE.test .$FILE.out-x .$FILE.test-x 
done
for FILE in $files1; do
    echo ${BLUE}${FILE}${NORMAL}
    curl -X POST -s  "${URL}/game/set_up_board?gid=auto1&board=$(node test.js ./$FILE.in)" > .$FILE.test;
    tr "_" " " <  $FILE.out  > .$FILE.out-x
    tr "_" " " < .$FILE.test > .$FILE.test-x
    colordiff -wub -U 10 .$FILE.out-x .$FILE.test-x || { echo ""; >&2 echo "error in $FILE"; fail=1; }
    rm -f .$FILE.test .$FILE.out-x .$FILE.test-x
done


exit $fail
