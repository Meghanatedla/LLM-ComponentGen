import {readFileSync, existsSync} from 'fs';
import escomplex from 'typhonjs-escomplex';

function calc_cyclomatic_complexity(path_to_file) {
    if (!existsSync(path_to_file)) {
        return -1;
    }
    const code = readFileSync(path_to_file).toString('utf-8');
    const result = escomplex.analyzeModule(code);
    return result['aggregate']['halstead']['volume'];
}

// read path from terminal and call function
const path_to_file = process.argv[2];
console.log(calc_cyclomatic_complexity(path_to_file));