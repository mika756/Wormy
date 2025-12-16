export function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        count: 1,
        delay: 1
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--count' || arg === '-c') {
            options.count = parseInt(args[i + 1], 10);
            if (isNaN(options.count) || options.count < 1) {
                throw new Error('Invalid count value. Must be a positive integer.');
            }
            i++;
        } else if (arg === '--delay' || arg === '-d') {
            options.delay = parseInt(args[i + 1], 10) * 1000;
            if (isNaN(options.delay) || options.delay < 0) {
                throw new Error('Invalid delay value. Must be a non-negative integer.');
            }
            i++;
        }
    }

    return options;
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
