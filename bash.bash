PACKAGE_NAME="babelist"
mkdir dist

oak fmt src/* --fix
echo ""

oak build --entry src/main.oak --output dist/$PACKAGE_NAME.oak
oak build --entry src/main.oak --output dist/$PACKAGE_NAME.js --web
echo ""

oak pack --entry src/main.oak --output dist/$PACKAGE_NAME
echo ""

chmod +x dist/$PACKAGE_NAME