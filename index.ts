import chalk from 'chalk';
import { setTimeout } from 'node:timers/promises'
import { createPool, sql } from "slonik"
import type { StreamHandler } from 'slonik/dist/types.js';

type Series = { from: number, to: number, processFunc: (rows: any[]) => Promise<void> }

if (typeof process.env.DATABASE_URL !== 'string') throw new Error();

const pool = await createPool(process.env.DATABASE_URL)

const batchSize = 20

async function processRows(series: Series, rows: any[]) {
    const { from, to, processFunc } = series
    console.log(`${chalk.bold(`Processing ${rows.length} rows for series:`)}`, { from, to })
    await processFunc(rows)
} 

async function getStreamFunction(series: Series ,handler: StreamHandler<{ n: number}>) {
    await pool.stream(sql.unsafe`
            SELECT generate_series AS n
            FROM generate_series(${series.from}::integer, ${series.to}::integer)
    `, handler)
}

try {
    const seriesList = [{
        from: 0,
        to: 50,
        processFunc: async (rows: any[]) => {
            await setTimeout(2000)
            console.log('--------------------')
            console.log(chalk.bgHex('#5ba300').hex('#000').bold('First row in batch'), rows.at(0))
            console.log(chalk.bgHex('#5ba300').hex('#000').bold('Last row in batch'), rows.at(-1))
            console.log('--------------------')
        }
    }, {
        from: 50,
        to: 100,
         processFunc: async (rows: any[]) => {
            await setTimeout(2000)
            console.log('--------------------')
            console.log(chalk.bgHex('#e6308a').hex('#000').bold('First row in batch'), rows.at(0))
            console.log(chalk.bgHex('#e6308a').hex('#000').bold('Last row in batch'), rows.at(-1))
            console.log('--------------------')
        }
    }]

    for (const series of seriesList) {
        const { from, to } = series
        console.log(chalk.bgHex('#0073e6').white.bold('Started processing series:'), { from, to })
        await getStreamFunction(series , async function (stream) {
            const pendingRows = []

            for await (const row of stream) {
                pendingRows.push(row.data)
                if (pendingRows.length >= batchSize) {
                    await processRows(series, pendingRows)
                    pendingRows.length = 0
                }
            }

            console.log(chalk.bgHex('#c44601').white.bold('Flushing remaining rows for series:'), { from, to })
            if (pendingRows.length > 0) {
                await processRows(series, pendingRows)
                pendingRows.length = 0
            }

        })
        console.log(`${chalk.bgHex('#89ce00').hex('#000').bold('Finished processing for series:')}`, { from, to }, '\n')
    }

    
} finally {
    await pool.end()
}
