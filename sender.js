const { execSync } = require('child_process');

let counter = 1000;
let sinalNegative = false;

setInterval(() => {
	if (sinalNegative) {
		counter--;

		sinalNegative = counter > 1000;
	} else {
		counter++;

		sinalNegative = counter > 4000;
	}

	execSync(`echo "${counter}" > /dev/pts/4`);
}, 1000);
