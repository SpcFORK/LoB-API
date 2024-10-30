PACKAGE_NAME="babelist"
ENTRY_OAK="--entry src/main.oak"
OUTPUT_OAK="dist/$PACKAGE_NAME"
OUTPUT_TMP="--output $OUTPUT_OAK"
mkdir dist

oak fmt src/* --fix
echo ""

oak build $ENTRY_OAK $OUTPUT_TMP.oak
oak build $ENTRY_OAK $OUTPUT_TMP.js --web
echo ""

oak pack $ENTRY_OAK $OUTPUT_TMP
echo ""

chmod +x $OUTPUT_OAK
