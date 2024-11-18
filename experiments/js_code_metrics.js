import {readFileSync, existsSync} from 'fs';
import escomplex from 'typhonjs-escomplex';

/**
 * Calculate the cyclomatic complexity of a given file.
 * @param {string} path_to_file - The path to the file.
 * @returns {number} The cyclomatic complexity of the file.
*/
function calc_cyclomatic_complexity(path_to_file) {
    if (!existsSync(path_to_file)) {
        return -1;
    }
    const code = readFileSync(path_to_file).toString('utf-8');
    const result = escomplex.analyzeModule(code);
    return result['aggregate']['cyclomatic'];
}

const path_to_file = process.argv[2];
console.log(calc_cyclomatic_complexity(path_to_file));