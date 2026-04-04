import { Eta } from "eta";
import path from "node:path"
import { logger } from "./logger.mjs";
import { copyFile } from "node:fs/promises";
import { runOpenCode } from "./runOpenCode";


export async function main() {
    const nextStatePath = path.resolve(import.meta.dirname, "../../logs", `${process.env.AYNIG_COMMIT_HASH}-next-state.md`);

    await copyFile(path.resolve(import.meta.dirname, 'next-state.md'), nextStatePath)

    logger.debug({
        state: process.env.AYNIG_TRAILER_DWP_STATE,
        ticket: process.env.AYNIG_TRAILER_DWP_TICKET,
        nextStatePath
    }, 'Starting DWP command')
    
    const eta = new Eta({ views: path.resolve(import.meta.dirname, "prompts") })

    const context = Object.assign({
        NEXT_STATE: nextStatePath
    }, process.env)

    const prompt = eta.render(`${process.env.AYNIG_TRAILER_DWP_STATE}.md`, context)

    const { code, err } = await runOpenCode({ prompt });
}
