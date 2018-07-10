import {Cons, assem10} from './adt';

interface Fine<A> extends Cons {
    tag: "Fine", 
    body: A
}
interface Poor<B> extends Cons {
    tag: "Poor", 
    body: B
}
export type Condition<A,B> = Fine<A> | Poor<B>;

export function fine<A,B>(x:A): Condition<A,B> {
    return {tag:"Fine", body:x}
}
export function poor<A,B>(x:B): Condition<A,B> {
    return {tag:"Poor", body:x}
}

export const isFine = assem10({
    Fine: (x) => true, 
    Poor: (x) => false
})
export const isPoor = assem10({
    Fine: (x) => false, 
    Poor: (x) => true
})