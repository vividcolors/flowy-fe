
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
    const len = bytes.length
    var rv = ""
    for (let i = 0; i < len; i++) {
        if (bytes[i] < 16) {
            rv += "0" + bytes[i].toString(16)
        } else {
            rv += bytes[i].toString(16)
        }
    }
    return rv
}
export function hexToBin(str:string):number[] {
    const len2 = str.length
    const len = len2 / 2
    var rv = new Array(len)
    for (let i = 0; i < len; i++) {
        rv[i] = parseInt(str.slice(i * 2, i * 2 + 2), 16)
    }
    return rv
}
export function binToBase64(bytes:number[]):string {
    return window.btoa(String.fromCharCode(...bytes))
}