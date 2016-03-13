if [ -d ".build" ]; then
  rm -rf .build
fi
mkdir .build

cp -r * .build/
ghp-import -np .build

rm -rf .build
