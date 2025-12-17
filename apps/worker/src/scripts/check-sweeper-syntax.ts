
import './setup-env';
import { runSweeper } from '../jobs/sweeper';

async function main() {
    console.log("Checking Sweeper Syntax...");
    if (typeof runSweeper === 'function') {
        console.log("Sweeper module loaded successfully.");
    } else {
        throw new Error("Sweeper export is not a function");
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
