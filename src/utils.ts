
export const oncreate = (e :Element) => {
    e.classList.add('oncreate')
    window.setTimeout(() => e.classList.remove('oncreate'), 50)
    
    const ctrl = e.querySelector('.default-input') as HTMLInputElement
    if (ctrl) {
        ctrl.focus()
    }
}
export const onremove = (e :Element, done) => {
    e.classList.add('onremove')
    e.addEventListener('transitionend', () => done())
}
export const invalidateBody = () => {
    document.body.classList.add('inactive')
}
export const validateBody = () => {
    document.body.classList.remove('inactive')
}

export const trigger = (type:string, detail ?:any) => {
    let event :CustomEvent
    if (typeof detail === 'undefined') {
        detail = {}
    }
    try {
        event = new CustomEvent(type, { detail: detail });
    } catch (e) {
        event = (document.createEvent('CustomEvent')) as CustomEvent;
        event.initCustomEvent(type, false, false, detail);
    }
    document.body.dispatchEvent(event)
}

export const round = (num :number):number => {
    if (num < 10) {
        return Math.round(num * 100) / 100;
    } else if (num < 100) {
        return Math.round(num * 10) / 10;
    } else {
        return Math.round(num);
    }
}
export const showSize = (size :number):string => {
    if (size < 1024) {
        return round(size) + 'bytes'
    } else if (size / 1024 < 1024) {
        return round(size / 1024) + 'KB'
    } else if (size / 1048576 < 1024 ) {
        return round(size / 1048576) + 'MB'
    } else {
        return round(size / 1073741824) + 'GB'
    }
}

export function callIf<D>(pred:boolean, then:() => D): D {
    if (pred) {
        return then()
    } else {
        return null
    }
}
export function binToHex(bytes:number[]):string {
    const str = window.btoa(String.fromCharCode(...bytes))
    const rv = str.replace(/\+/g, '-').replace(/\//g, '.').replace(/=/g, '_')
    return rv
}
export function hexToBin(str:string):number[] {
    const str2 = str.replace(/-/g, '+').replace(/\./g, '/').replace(/_/, '=')
    const str3 = window.atob(str2)
    var rv = new Array(str3.length)
    for (let i = 0; i < str3.length; i++) {
        rv[i] = str3.charCodeAt(i)
    }
    return rv
}
export function binToBase64(bytes:number[]):string {
    return window.btoa(String.fromCharCode(...bytes))
}