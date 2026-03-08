// Run this in the browser console to get the saved scenes JSON
const scenes = localStorage.getItem('savedScenes');
if (scenes) {
    console.log(JSON.stringify(JSON.parse(scenes), null, 2));
} else {
    console.log('No saved scenes found');
}
