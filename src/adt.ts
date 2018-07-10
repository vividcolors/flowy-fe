
export interface Cons {
    tag :string
}

export interface Ftab10<T extends Cons, U> { [index: string]: (t:T) => U }
export interface Ftab20<T extends Cons, U0, U> { [index: string]: (t:T, u0:U0) => U}
export interface Ftab21<T extends Cons, U0, U> { [index: string]: (u0:U0, t:T) => U}
export interface Ftab30<T extends Cons, U0, U1, U> {[index: string]: (t:T, u0:U0, u1:U1) => U}
export interface Ftab31<T extends Cons, U0, U1, U> {[index: string]: (u0:U0, t:T, u1:U1) => U}
export interface Ftab32<T extends Cons, U0, U1, U> {[index: string]: (u0:U0, u1:U1, t:T) => U}
export interface Ftab40<T extends Cons,U0,U1,U2,U> {[index: string]: (t:T,u0:U0,u1:U1,u2:U2) => U}
export interface Ftab41<T extends Cons,U0,U1,U2,U> {[index: string]: (u0:U0,t:T,u1:U1,u2:U2) => U}
export interface Ftab42<T extends Cons,U0,U1,U2,U> {[index: string]: (u0:U0,u1:U1,t:T,u2:U2) => U}
export interface Ftab43<T extends Cons,U0,U1,U2,U> {[index: string]: (u0:U0,u1:U1,u2:U2,t:T) => U}
export interface Ftab010<T extends Cons,U> {[index:string]:() => (t:T) => U}
export interface Ftab110<X,T extends Cons,U> {[index:string]:(x:X) => (t:T) => U}
export interface Ftab210<X0,X1,T extends Cons,U> {[index:string]:(x0:X0, x1:X1) => (t:T) => U}
export interface Ftab020<T extends Cons,U0,U> {[index:string]:() => (t:T, u0:U0) => U}
export interface Ftab021<T extends Cons,U0,U> {[index:string]:() => (u0:U0, t:T) => U}
export interface Ftab120<X,T extends Cons,U0,U> {[index:string]:(x:X) => (t:T, u0:U0) => U}
export interface Ftab121<X,T extends Cons,U0,U> {[index:string]:(x:X) => (u0:U0, t:T) => U}
export interface Ftab220<X0,X1,T extends Cons,U0,U> {[index:string]:(x0:X0, x1:X1) => (t:T, u0:U0) => U}
export interface Ftab221<X0,X1,T extends Cons,U0,U> {[index:string]:(x0:X0, x1:X1) => (u0:U0, t:T) => U}
export interface Ftab030<T extends Cons,U0,U1,U> {[index:string]:() => (t:T, u0:U0, u1:U1) => U}
export interface Ftab031<T extends Cons,U0,U1,U> {[index:string]:() => (u0:U0, t:T, u1:U1) => U}
export interface Ftab032<T extends Cons,U0,U1,U> {[index:string]:() => (u0:U0, u1:U1, t:T) => U}
export interface Ftab130<X,T extends Cons,U0,U1,U> {[index:string]:(x:X) => (t:T, u0:U0, u1:U1) => U}
export interface Ftab131<X,T extends Cons,U0,U1,U> {[index:string]:(x:X) => (u0:U0, t:T, u1:U1) => U}
export interface Ftab132<X,T extends Cons,U0,U1,U> {[index:string]:(x:X) => (u0:U0, u1:U1, t:T) => U}
export interface Ftab230<X0,X1,T extends Cons,U0,U1,U> {[index:string]:(x0:X0, x1:X1) => (t:T, u0:U0, u1:U1) => U}
export interface Ftab231<X0,X1,T extends Cons,U0,U1,U> {[index:string]:(x0:X0, x1:X1) => (u0:U0, t:T, u1:U1) => U}
export interface Ftab232<X0,X1,T extends Cons,U0,U1,U> {[index:string]:(x0:X0, x1:X1) => (u0:U0, u1:U1, t:T) => U}

function error(tag:string, ftab:any):never {
    const msg = `*** tag ${tag} is not in ${ftab}`
    throw new Error(msg)
}

export function assem10<T extends Cons,U>(ftab :Ftab10<T,U>): (t:T) => U {
    return (a:T) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](a) : error(a.tag, ftab)
}
export function assem20<T extends Cons,U0,U>(ftab :Ftab20<T,U0,U>): (t:T,u0:U0) => U {
    return (a:T, b:U0) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](a, b) : error(a.tag, ftab)
}
export function assem21<T extends Cons,U0,U>(ftab :Ftab21<T,U0,U>): (u0:U0,t:T) => U {
    return (b:U0, a:T) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](b, a) : error(a.tag, ftab)
}
export function assem30<T extends Cons,U0,U1,U>(ftab :Ftab30<T,U0,U1,U>): (t:T,u0:U0,u1:U1) => U {
    return (a:T, b:U0, c:U1) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](a, b, c) : error(a.tag, ftab)
}
export function assem31<T extends Cons,U0,U1,U>(ftab :Ftab31<T,U0,U1,U>): (u0:U0,t:T,u1:U1) => U {
    return (b:U0, a:T, c:U1) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](b, a, c) : error(a.tag, ftab)
}
export function assem32<T extends Cons,U0,U1,U>(ftab :Ftab32<T,U0,U1,U>): (u0:U0,u1:U1,t:T) => U {
    return (b:U0, c:U1, a:T) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](b, c, a) : error(a.tag, ftab)
}
export function assem40<T extends Cons,U0,U1,U2,U>(ftab :Ftab40<T,U0,U1,U2,U>): (t:T,u0:U0,u1:U1,u2:U2) => U {
    return (a:T, b:U0, c:U1, d:U2) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](a, b, c, d) : error(a.tag, ftab)
}
export function assem41<T extends Cons,U0,U1,U2,U>(ftab :Ftab41<T,U0,U1,U2,U>): (u0:U0,t:T,u1:U1,u2:U2) => U {
    return (b:U0, a:T, c:U1, d:U2) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](b, a, c, d) : error(a.tag, ftab)
}
export function assem42<T extends Cons,U0,U1,U2,U>(ftab :Ftab42<T,U0,U1,U2,U>): (u0:U0,u1:U1,t:T,u2:U2) => U {
    return (b:U0, c:U1, a:T, d:U2) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](b, c, a, d) : error(a.tag, ftab)
}
export function assem43<T extends Cons,U0,U1,U2,U>(ftab :Ftab43<T,U0,U1,U2,U>): (u0:U0,u1:U1,u2:U2,t:T) => U {
    return (b:U0, c:U1, d:U2, a:T) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](b, c, d, a) : error(a.tag, ftab)
}
export function assem010<T extends Cons,U>(ftab:Ftab010<T,U>): () => (t:T) => U {
    return () => (a:T) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag]()(a) : error(a.tag, ftab)
}
export function assem110<X,T extends Cons,U>(ftab:Ftab110<X,T,U>): (x:X) => (t:T) => U {
    return (x:X) => (a:T) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](x)(a) : error(a.tag, ftab)
}
export function assem210<X0,X1,T extends Cons,U>(ftab:Ftab210<X0,X1,T,U>): (x0:X0, x1:X1) => (t:T) => U {
    return (x0:X0, x1:X1) => (a:T) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](x0, x1)(a) : error(a.tag, ftab)
}
export function assem020<T extends Cons,U0,U>(ftab:Ftab020<T,U0,U>): () => (t:T, u0:U0) => U {
    return () => (a, u0) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag]()(a, u0) : error(a.tag, ftab)
}
export function assem021<T extends Cons,U0,U>(ftab:Ftab021<T,U0,U>): () => (u0:U0, t:T) => U {
    return () => (u0, a) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag]()(u0, a) : error(a.tag, ftab)
}
export function assem120<X,T extends Cons,U0,U>(ftab:Ftab120<X,T,U0,U>): (x:X) => (t:T, u0:U0) => U {
    return (x) => (a, u0) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](x)(a, u0) : error(a.tag, ftab)
}
export function assem121<X,T extends Cons,U0,U>(ftab:Ftab121<X,T,U0,U>): (x:X) => (u0:U0, t:T) => U {
    return (x) => (u0, a) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](x)(u0, a) : error(a.tag, ftab)
}
export function assem220<X0,X1,T extends Cons,U0,U>(ftab:Ftab220<X0,X1,T,U0,U>): (x0:X0, x1:X1) => (t:T, u0:U0) => U {
    return (x0, x1) => (a, u0) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](x0, x1)(a, u0) : error(a.tag, ftab)
}
export function assem221<X0,X1,T extends Cons,U0,U>(ftab:Ftab221<X0,X1,T,U0,U>): (x0:X0, x1:X1) => (u0:U0, t:T) => U {
    return (x0, x1) => (u0, a) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](x0, x1)(u0, a) : error(a.tag, ftab)
}

export function assem030<T extends Cons,U0,U1,U>(ftab:Ftab030<T,U0,U1,U>): () => (t:T, u0:U0, u1:U1) => U {
    return () => (a, u0, u1) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag]()(a, u0, u1) : error(a.tag, ftab)
}
export function assem031<T extends Cons,U0,U1,U>(ftab:Ftab031<T,U0,U1,U>): () => (u0:U0, t:T, u1:U1) => U {
    return () => (u0, a, u1) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag]()(u0, a, u1) : error(a.tag, ftab)
}
export function assem032<T extends Cons,U0,U1,U>(ftab:Ftab032<T,U0,U1,U>): () => (u0:U0, u1:U1, t:T) => U {
    return () => (u0, u1, a) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag]()(u0, u1, a) : error(a.tag, ftab)
}

export function assem130<X,T extends Cons,U0,U1,U>(ftab:Ftab130<X,T,U0,U1,U>): (x:X) => (t:T, u0:U0, u1:U1) => U {
    return (x) => (a, u0, u1) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](x)(a, u0, u1) : error(a.tag, ftab)
}
export function assem131<X,T extends Cons,U0,U1,U>(ftab:Ftab131<X,T,U0,U1,U>): (x:X) => (u0:U0, t:T, u1:U1) => U {
    return (x) => (u0, a, u1) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](x)(u0, a, u1) : error(a.tag, ftab)
}
export function assem132<X,T extends Cons,U0,U1,U>(ftab:Ftab132<X,T,U0,U1,U>): (x:X) => (u0:U0, u1:U1, t:T) => U {
    return (x) => (u0, u1, a) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](x)(u0, u1, a) : error(a.tag, ftab)
}
export function assem230<X0,X1,T extends Cons,U0,U1,U>(ftab:Ftab230<X0,X1,T,U0,U1,U>): (x0:X0, x1:X1) => (t:T, u0:U0, u1:U1) => U {
    return (x0, x1) => (a, u0, u1) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](x0, x1)(a, u0, u1) : error(a.tag, ftab)
}
export function assem231<X0,X1,T extends Cons,U0,U1,U>(ftab:Ftab231<X0,X1,T,U0,U1,U>): (x0:X0, x1:X1) => (u0:U0, t:T, u1:U1) => U {
    return (x0, x1) => (u0, a, u1) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](x0, x1)(u0, a, u1) : error(a.tag, ftab)
}
export function assem232<X0,X1,T extends Cons,U0,U1,U>(ftab:Ftab232<X0,X1,T,U0,U1,U>): (x0:X0, x1:X1) => (u0:U0, u1:U1, t:T) => U {
    return (x0, x1) => (u0, u1, a) => (ftab.hasOwnProperty(a.tag)) ? ftab[a.tag](x0, x1)(u0, u1, a) : error(a.tag, ftab)
}