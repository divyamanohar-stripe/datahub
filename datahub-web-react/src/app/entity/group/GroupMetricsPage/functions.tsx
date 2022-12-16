import moment from 'moment-timezone';
import { orderBy } from 'lodash';
import { convertSecsToHumanReadable } from '../../shared/stripe-utils';
import {
    DataEntity,
    DataRunEntity,
    DownstreamTeam,
    DownstreamTeamEntity,
    SLAMissData,
    SLAMissTypes,
} from './interfaces';
import { SlaInfo } from '../../../../types.generated';

/**
 * Check if current run has missed any of its SLAs
 * @param dataEnt the current data entity we are examining a run for
 * @param run the current run to examine
 * @param slaInfo SLA info set on the data entity
 * @return SLAMissData object for rendering SLA miss chart if SLA was missed for this run
 */
export function checkMetSLA(dataEnt: DataEntity, run: DataRunEntity, slaInfo: SlaInfo) {
    const startDate = moment.utc(run.execution.startDate);
    const execDate = moment.utc(run.execution.logicalDate);
    let state: string;
    if (run.state[0]?.result?.resultType) {
        state = run.state[0].result.resultType;
    } else {
        state = 'RUNNING';
    }
    // get end date, if no end date is set, use current UTC time
    let endDate;
    if (run.execution?.endDate) {
        endDate = moment.utc(run.execution.endDate);
    } else {
        endDate = moment.utc();
    }

    // prioritize error level & finished by SLA misses
    if (slaInfo.errorFinishedBy) {
        const target = moment(execDate).add(+slaInfo.errorFinishedBy, 's');
        if (endDate > target) {
            return {
                executionDate: moment.utc(run.execution.logicalDate).format('YYYY-MM-DD HH:mm:ss'),
                missType: SLAMissTypes.finishedBy,
                sla: convertSecsToHumanReadable(+slaInfo.errorFinishedBy),
                missedBy: convertSecsToHumanReadable(moment(endDate).diff(target, 's')),
                externalUrl: run.externalUrl,
                dataEnt,
                state,
            } as SLAMissData;
        }
    }

    if (slaInfo.errorStartedBy) {
        const target = moment(execDate).add(+slaInfo.errorStartedBy, 's');
        if (startDate > target) {
            return {
                executionDate: moment.utc(run.execution.logicalDate).format('YYYY-MM-DD HH:mm:ss'),
                missType: SLAMissTypes.startedBy,
                sla: convertSecsToHumanReadable(+slaInfo.errorStartedBy),
                missedBy: convertSecsToHumanReadable(moment(startDate).diff(target, 's')),
                externalUrl: run.externalUrl,
                dataEnt,
                state,
            } as SLAMissData;
        }
    }

    if (slaInfo.warnFinishedBy) {
        const target = moment(execDate).add(+slaInfo.warnFinishedBy, 's');
        if (endDate > target) {
            return {
                executionDate: moment.utc(run.execution.logicalDate).format('YYYY-MM-DD HH:mm:ss'),
                missType: SLAMissTypes.warnFinishedBy,
                sla: convertSecsToHumanReadable(+slaInfo.warnFinishedBy),
                missedBy: convertSecsToHumanReadable(moment(endDate).diff(target, 's')),
                externalUrl: run.externalUrl,
                dataEnt,
                state,
            } as SLAMissData;
        }
    }

    if (slaInfo.warnStartedBy) {
        const target = moment(execDate).add(+slaInfo.warnStartedBy, 's');
        if (startDate > target) {
            return {
                executionDate: moment.utc(run.execution.logicalDate).format('YYYY-MM-DD HH:mm:ss'),
                missType: SLAMissTypes.warnStartedBy,
                sla: convertSecsToHumanReadable(+slaInfo.warnStartedBy),
                missedBy: convertSecsToHumanReadable(moment(startDate).diff(target, 's')),
                externalUrl: run.externalUrl,
                dataEnt,
                state,
            } as SLAMissData;
        }
    }
    return null;
}

/**
 * format runs to remove all but last try per execution date and sort in order
 * @param runs the list of runs to format
 */
export function formatRuns(runs: DataRunEntity[]) {
    // sort by start date to remove all but last try per execution date
    runs.sort((a, b) => (a.execution.startDate < b.execution.startDate ? 1 : -1));
    const uniqueExecDates: number[] = [];
    const latestRuns = runs.filter((run) => {
        const isDuplicate = uniqueExecDates.includes(run.execution.logicalDate);
        if (!isDuplicate) {
            uniqueExecDates.push(run.execution.logicalDate);
            return true;
        }
        return false;
    });
    // sort by execution date
    latestRuns.sort((a, b) => (a.execution.logicalDate > b.execution.logicalDate ? 1 : -1));
    return latestRuns;
}

/**
 * Gather run and SLA metrics to create chart and table
 * @param dataEntities
 * @return list of [percent met SLA per day (execution date truncated to day), total percent met over all runs, list of SLAMissData objects to generate SLA miss table]
 */
export function getRunMetrics(dataEntities: DataEntity[]): [{ date: string; value: number }[], number, SLAMissData[]] {
    // const slaDefinedRuns = 0;
    const metSLAMetrics = new Map();
    let missedSLADataEnts: SLAMissData[] = [];
    for (let d = 0; d < dataEntities.length; d++) {
        const currDataEnt = dataEntities[d];
        if (currDataEnt?.runs?.runs) {
            const currRuns = formatRuns(currDataEnt.runs.runs);
            for (let r = 0; r < currRuns.length; r++) {
                const currRun = currRuns[r];
                const execDateTruncated = moment.utc(currRun.execution.logicalDate).startOf('day').format('YYYY-MM-DD');
                // if no SLA is set, skip this run
                if (currRun.slaInfo && currRun.slaInfo.slaDefined === 'true') {
                    const missedSLA = checkMetSLA(currDataEnt, currRun, currRun.slaInfo);
                    // at idx 0: 1 = met SLA, -1 = missed SLA
                    if (missedSLA) {
                        if (metSLAMetrics.has(execDateTruncated)) {
                            metSLAMetrics.set(execDateTruncated, [
                                metSLAMetrics.get(execDateTruncated)[0],
                                metSLAMetrics.get(execDateTruncated)[1] + 1,
                            ]);
                        } else {
                            metSLAMetrics.set(execDateTruncated, [0, 1]);
                        }
                        // if we missed SLA, create SLAMissData object for SLA miss table
                        missedSLADataEnts.push(missedSLA);
                    } else if (metSLAMetrics.has(execDateTruncated)) {
                        metSLAMetrics.set(execDateTruncated, [
                            metSLAMetrics.get(execDateTruncated)[0] + 1,
                            metSLAMetrics.get(execDateTruncated)[1],
                        ]);
                    } else {
                        metSLAMetrics.set(execDateTruncated, [1, 0]);
                    }
                }
            }
        }
    }
    let metSLANumber = 0;
    let missedSLANumber = 0;
    let slaGraphData: { date: string; value: number }[] = [];
    metSLAMetrics.forEach((value, key) => {
        slaGraphData.push({ date: key, value: +(((value[0] * 1.0) / (value[0] + value[1])) * 100.0).toFixed(2) });
        metSLANumber += value[0];
        missedSLANumber += value[1];
    });
    slaGraphData = orderBy(slaGraphData, 'date');
    // get total percentage of met SLA runs over all runs that have an SLA defined
    const percentMetVal: number = +((metSLANumber / (metSLANumber + missedSLANumber)) * 100.0).toFixed(2);
    missedSLADataEnts = orderBy(missedSLADataEnts, 'executionDate', 'desc');
    return [slaGraphData, percentMetVal, missedSLADataEnts];
}

export function getOwnershipInfo(ownership) {
    let teamName;
    let ownerEntity;
    let ownerUrn;
    let idx = 0;
    if (ownership !== undefined && ownership !== null && ownership.owners.length > 0) {
        for (idx = 0; idx < ownership.owners.length; idx++) {
            teamName = ownership?.owners[idx]?.owner?.properties?.displayName;
            ownerEntity = ownership?.owners[idx]?.owner;
            ownerUrn = ownership?.owners[idx]?.owner?.urn;
            if (teamName === undefined) {
                teamName = ownership?.owners[idx]?.owner?.name;
            }
            if (teamName !== undefined) {
                break;
            }
        }
    }
    if (teamName !== undefined) {
        return [teamName, ownerEntity, idx, ownerUrn];
    }
    return ['No Team Defined', undefined, idx, undefined];
}

export function getDownstreamTeams(dataEntities: DownstreamTeamEntity[], urn) {
    let teamMap: DownstreamTeam[] = [];
    for (let i = 0; i < dataEntities.length; i++) {
        const downstreams = dataEntities[i].downstream.relationships;
        for (let d = 0; d < downstreams.length; d++) {
            const currDownstream = downstreams[d].entity;
            const teamInfo = getOwnershipInfo(currDownstream.ownership);
            const teamName = teamInfo[0];
            const ownerEntity = teamInfo[1];
            const ownerIdx = teamInfo[2];
            const ownerUrn = teamInfo[3];
            const email = currDownstream.ownership?.owners[ownerIdx]?.owner?.properties?.email;
            const homePage = currDownstream.ownership?.owners[ownerIdx]?.owner?.editableProperties?.description;
            const slack = currDownstream.ownership?.owners[ownerIdx]?.owner?.editableProperties?.slack;
            const idx = teamMap.findIndex((t) => t.teamName === teamName);
            // only add to downstream list if not owned by current team page
            if (ownerUrn !== urn) {
                if (idx > -1) {
                    const { entities } = teamMap[idx];
                    entities.push(currDownstream);
                } else {
                    const newDownstreamTeam = {
                        teamName,
                        slack,
                        email,
                        homePage,
                        entities: [currDownstream],
                        ownerEntity,
                    } as DownstreamTeam;
                    teamMap.push(newDownstreamTeam);
                }
            }
        }
    }
    teamMap.map((team) => {
        const t = team;
        t.count = t.entities.length;
        return t;
    });
    teamMap = orderBy(teamMap, 'count', 'desc');
    return teamMap;
}
