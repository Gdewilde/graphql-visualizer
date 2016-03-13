if [ -d "_build" ]; then
  rm -rf _build
fi
mkdir _build

cp -r * _build/
ghp-import -np _build
