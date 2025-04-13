# Obsolete Files for Deletion

Following the implementation of the refactoring plan, these files are now obsolete and can be safely deleted:

## Old Button Finding and Detection Files
- `src/utils/buttonFinders.js` - Replaced by the new ButtonFinder class
- `src/detection/button-recognition.js` - Replaced by the new finder module
- `src/detection/cloud-detection.js` - Replaced by the new DialogFinder class

## Old Selector Files
- `improved-selectors.json` - Consolidated into main selectors.json
- `improved-selectors-part2.json` - Consolidated into main selectors.json
- `improved-selectors-part3.json` - Consolidated into main selectors.json
- `new-selectors.json` - Consolidated into main selectors.json

## Temporary or Draft Files
- `src/utils/finders/dialogFinder.new.js` - Development version that should be deleted

## Next Steps
1. Verify that all imports from these files have been updated to use the new modules
2. Run tests to ensure everything still works correctly after deletion
3. Delete the files only after confirming all references have been updated

## Verification Process
Before deleting, check one more time for any remaining imports:

```
grep -r "import.*buttonFinders" --include="*.js" .
grep -r "import.*button-recognition" --include="*.js" .
grep -r "import.*cloud-detection" --include="*.js" .
```

Only proceed with deletion after ensuring there are no remaining references to these files. 