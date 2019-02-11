const fs = require('fs');
const path = require('path');

const cladogram = require('./cladogram.js');

function serializeCladogram() {
    fs.writeFile(path.join(__dirname, 'generated/cladogram.json'), JSON.stringify(cladogram), (err) => {

        // throws an error, you could also catch it here
        if (err) throw err;

        // success case, the file was saved
        console.log('cladogram serialized!');
    });
}


const proteins = require('./generated/proteins_index.js');
index = proteins.speciesForProtein;
let a = [];
// Object.keys(index)
//     .forEach(p => {
//         a[parseInt(p)] = index[p];
//     });
// fs.writeFile(path.join(__dirname, 'generated/protein-species.json'), JSON.stringify(a), (err) => {
//     // throws an error, you could also catch it here
//     if (err) throw err;
//
//     // success case, the file was saved
//     console.log('protein-species serialized!');
// });

index = proteins.uniprotIdsMap;
a = {};
Object.keys(index)
    .forEach(p => {
        a[p] = index[p];
    });
fs.writeFile(path.join(__dirname, 'generated/protein-uniprotid.json'), JSON.stringify(a), (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
    console.log('protein-uniprotid serialized!');
});
