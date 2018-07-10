import { append, remove, find, findIndex } from 'ramda';

export interface Problem {
    detail :string|null, 
    invalidParams :{name :string, reason :string}[]
}
export const problem = (p ?:any):Problem => {
    const detail = (p && p['detail']) ? p.detail : null
    const invalidParams = (p && (p['invalidParams'] || p['invalid-params'])) ? (p['invalidParams'] || p['invalid-params']) : []
    return {detail:detail, invalidParams:invalidParams}
}
export const noProblem = (p:Problem) => ((p.detail === null && p.invalidParams.length === 0))
export const putDetail = (d:string|null, {detail, ...rest}:Problem) => ({detail:d, ...rest})
export type ShowCallback<X> = (r:string) => X
export function showDetail<X>(p:Problem, f:ShowCallback<X>) {
    if (p.detail !== null) {
        return f(p.detail)
    } else {
        return null
    }
}
export const putParam = (n:string, r:string|null, p:Problem) => {
    const {invalidParams, ...rest} = p
    const i = findIndex((e) => (e['name'] == n), invalidParams)
    if (i != -1) {
        let ps2 = remove(i, 1, invalidParams)
        if (r !== null) {
            ps2 = append({name:n, reason:r}, ps2)
        }
        return {invalidParams:ps2, ...rest}
    } else {
        if (r !== null) {
            return {invalidParams:append({name:n, reason:r}, invalidParams), ...rest}
        } else {
            return p
        }
    }
}
export function showParam<X>(p:string, prob:Problem, f:ShowCallback<X>) {
    const e = find((e) => (e['name'] == p), prob.invalidParams)
    if (e !== undefined) {
        return f(e['reason'])
    } else {
        return null
    }
}