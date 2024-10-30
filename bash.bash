PACKAGE_NAME="babelist"
ENTRY_OAK="--entry src/main.oak"
OUTPUT_TMP="--output dist/$PACKAGE_NAME"
mkdir dist

oak fmt src/* --fix
echo ""

oak build $ENTRY_OAK $OUTPUT_TMP.oak
oak build $ENTRY_OAK $OUTPUT_TMP.js --web
echo ""

oak pack $ENTRY_OAK $OUTPUT_TMP
echo ""

chmod +x dist/$PACKAGE_NAME
