
import { exec } from 'mz/child_process';
import { lookup as psLookup } from 'ps-node';

export interface IChildProcess {
    pid: number
    ppid: number
    command: string
}

export const getChildProcesses = (ppid: number) : Promise<IChildProcess[]> => {
	return new Promise(async (resolve, reject) => {
		if (process.platform === 'win32') {
			try {
				const [ output ] = await exec(`wmic process where (ParentProcessId=${ppid}) get Caption,ProcessId`);
				const processes = output.toString().split('\n').slice(1);

				const childProcesses = processes.map((process) => {
					const [ command, pid ] = process.trim().split(/\s+/);

					if (! command) {
						return null;
					}

					return { command, pid: parseInt(pid), ppid } as IChildProcess;
				});

				resolve(childProcesses.filter((x) => x));
			}

			catch (error) {
				reject(error);
			}
		}

		else {
			psLookup({ ppid }, (err, processes) => {
				if (err) {
					return reject(err);
				}

				resolve(processes as IChildProcess[]);
			});
		}
	});
};
