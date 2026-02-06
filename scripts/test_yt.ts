import YTDefault, * as YTAll from 'youtube-sr';

console.log('Import * as:', YTAll);
console.log('Import default:', YTDefault);

try {
    if (typeof YTDefault.searchOne === 'function') {
        console.log('YTDefault.searchOne is a function');
    }
} catch (e) {
    console.log('Error checking YTDefault.searchOne');
}

try {
    if (typeof YTAll.YouTube?.searchOne === 'function') {
        console.log('YTAll.YouTube.searchOne is a function');
    }
} catch (e) {
    console.log('Error checking YTAll.YouTube.searchOne');
}
