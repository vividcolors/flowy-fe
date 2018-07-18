
import { Cons, assem20, assem120, assem020 } from './adt';
import { h, app } from "hyperapp";
import { zipWith, remove, insert } from "ramda";
import xhr from 'xhr';
import { XhrUrlConfig } from 'xhr';
import { sha256 } from 'js-sha256';
import { Problem, problem, noProblem, putDetail, showDetail, putParam, showParam } from './problem';
import { oncreate, onremove, validateBody, invalidateBody, trigger, round, showSize, binToHex, hexToBin, binToBase64, callIf } from './utils';
import * as C from './config'
import { Condition, fine, poor, isFine, isPoor} from './condition'



/* basic types ------------------------ */
interface Parcel {
    id :string, 
    url :string, 
    senderId :string, 
    files :{name:string, size:number}[], 
    frozen :boolean, 
    dlCount :number
}


/* API client ------------------------- */
interface ParcelReadingResult {
    parcel :Parcel, 
    urls :string[]
}
type ParcelReadingCallback = (c:Condition<ParcelReadingResult, Problem>) => any
interface ApiClient {
    read: (parcelId:string, pw:string, k:ParcelReadingCallback) => void
}

function createApiClient():ApiClient {
    return {
        read: (parcelId:string, pw:string, k:ParcelReadingCallback) => {
            var hdrs = {}
            if (typeof pw === 'string' && pw != '') {
                hdrs['X-Flowy-ParcelSecret'] = pw
            }
            xhr({
                url: C.API_BASE + '/parcels/' + parcelId, 
                method: 'GET', 
                json: true, 
                headers: hdrs, 
                withCredentials: true
            }, (err, res, body) => {
                if (res.statusCode == 200) {
                    k(fine(body) as Condition<ParcelReadingResult, Problem>)
                } else if (res.statusCode == 403) {
                    k(poor(problem({detail:'not-authorized'})) as Condition<ParcelReadingResult, Problem>)
                } else {
                    k(poor(problem({detail:'エラーが発生しました。URLが間違っているか、期限切れの可能性があります。'})) as Condition<ParcelReadingResult, Problem>)
                }
            })
        }
    }
}


interface Setup {
    tag :"Setup", 
    userStatus :number,  // 0:initial, 1:loading, 2:done
    parcelStatus :number,  // 0:initial, 1:loading, 2:done
    pw: string, 
    pwRequired: boolean, 
    prob :Problem
}
interface SetupActions {
    init: () => (s:Setup, a:SetupActions) => Setup, 
    handleCheckUserResponse: (body:any) => (s:Setup, a:SetupActions) => Setup, 
    changePw: (e:Event) => (s:Setup, a:SetupActions) => Setup, 
    cancel: () => (s:Setup, a:SetupActions) => Setup, 
    read: () => (s:Setup, a:SetupActions) => Setup, 
    readK: (c:Condition<ParcelReadingResult,Problem>) => (s:Setup, a:SetupActions) => Setup
}
function createInitialSetup():Setup {
    window.requestAnimationFrame(() => allActions.setup.init())
    return {
        tag: "Setup", 
        userStatus: 0, 
        parcelStatus: 0, 
        pw: "", 
        pwRequired: false, 
        prob: problem()
    }
}
function createSetupActions(api:ApiClient):SetupActions {
    return {
        init: () => ({userStatus, ...rest}, actions) => {
            const k2 = function (e:CustomEvent) {
                document.body.removeEventListener('checkUserResponse', k2)
                allActions.setup.handleCheckUserResponse(e.detail)
            }
            document.body.addEventListener('checkUserResponse', k2)
            trigger('checkUser')
            return {userStatus:1, ...rest}
        }, 
        handleCheckUserResponse: (body) => ({userStatus, ...rest}, actions) => {
            window.requestAnimationFrame(actions.read)
            return {userStatus:2, ...rest}
        }, 
        changePw: (e:Event) => ({pw, prob, ...rest}, actions) => {
            const el = e.target as HTMLInputElement
            return {pw:el.value, prob:putParam('pw', null, prob), ...rest}
        }, 
        cancel: () => ({parcelStatus, pwRequired, prob, ...rest}, actions) => {
            return {parcelStatus:2, pwRequired:false, prob:putDetail('パスワードの入力がキャンセルされました。', prob), ...rest}
        }, 
        read: () => ({parcelStatus, prob, ...rest}, actions) => {
            const parcelId = window.location.search.slice(3)
            if (!! parcelId) {
                api.read(parcelId, rest.pw, actions.readK)
                return {parcelStatus:1, prob:putDetail(null, prob), ...rest}
            } else {
                return {parcelStatus:2, prob:putDetail("エラーが発生しました。URLが間違っています。", prob), ...rest}
            }
        }, 
        readK: (c) => ({parcelStatus, prob, pwRequired, ...rest}, actions) => {
            if (isPoor(c)) {
                const p = c.body as Problem
                if (p.detail == 'not-authorized') {
                    if (! pwRequired) {
                        // 初回
                        return {parcelStatus:0, prob:prob, pwRequired:true, ...rest}
                    } else {
                        // パスワード間違い
                        prob = putParam('pw', 'パスワードが間違っています。', prob)
                        return {parcelStatus:0, prob:prob, pwRequired:pwRequired, ...rest}
                    }
                } else {
                    return {parcelStatus:2, prob:p, pwRequired:pwRequired, ...rest}
                }
            } else {
                const res = c.body as ParcelReadingResult
                if (pwRequired) {
                    window.setTimeout(() => allActions.download.init(res), 500)
                } else {
                    window.requestAnimationFrame(() => allActions.download.init(res))
                }
                return {parcelStatus:2, prob:prob, pwRequired:false, ...rest}
            }
        }
    }
}
function viewSetup(state:Setup, actions:SetupActions) {
    function statusString(state:Setup) {
        if (!noProblem(state.prob) && state.prob.detail != 'not-authorized') {
            return showDetail(state.prob, (msg) => (<p class="alert">{msg}</p>))
        } else {
            return (<p class="title">データを取得しています。</p>)
        }
    }
    function viewPasswordModal() {
        if (state.pwRequired) {
            return (
                <div class="overlay" key="authoOverlay" oncreate={(e) => (oncreate(e), invalidateBody())} onremove={(e,d) => (onremove(e,d), validateBody())}>
                    <form onsubmit={(e) => {e.preventDefault();return false}} key="confirmForm">
                        <div class={`modal micro ${state.parcelStatus == 1 ? 'loading' : ''}`} key="authoModal">
                            <div class="modal-header">パスワードの入力</div>
                            <div class="modal-body">
                                <div class="modal-main">
                                    <p>ダウンロードを始めるにはパスワードを入力してください。</p>
                                    <div class="control">
                                        <label for="">パスワード</label>
                                        <input type="password" value={state.pw} oninput={actions.changePw} class="default-input" />
                                        {showParam('pw', state.prob, (msg) => (<span class="poor">{msg}</span>))}
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" onclick={() => actions.cancel()}>キャンセル</button>
                                    <button type="submit" class="primary" onclick={() => actions.read()}>送信する</button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )
        }
    }
    return (
        <div>
            {viewPasswordModal()}
            <div class={`frame ${(state.parcelStatus != 2) ? 'loading' : ''}`}>
                <div class="frame-header">ファイルの受信</div>
                <div class="frame-body" key="setup" onremove={onremove}>
                    <div class="frame-main no-footer">
                        <div class="board">
                            {statusString(state)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


interface Download {
    tag :"Download", 
    parcel :Parcel, 
    files :{name:string, size:number, url:string, downloaded:boolean}[], 
    started :boolean
}
interface DownloadActions {
    init: (prr:ParcelReadingResult) => (s:Download, a:DownloadActions) => Download, 
    getFile: (idx:number) => (s:Download, a:DownloadActions) => Download
}
function createDownloadActions():DownloadActions {
    const promoteFile = (f0:{name:string, size:number}, url:string) => {
        return {name:f0.name, size:f0.size, url:url, downloaded:false}
    }
    return {
        init: (prr) => (_state, actions) => {
            const files = zipWith(promoteFile, prr.parcel.files, prr.urls)
            return {tag:"Download", parcel:prr.parcel, files:files, started:false}
        }, 
        getFile: (idx) => ({files, started, ...rest}, actions) => {
            const {downloaded:_, ...fileRest} = files[idx]
            const files2 = insert(idx, {downloaded:true, ...fileRest}, remove(idx, 1, files))
            if (! started) {
                trigger('pageView', {'page':'/receiver/download','title':'ファイルの受信'})
            }
            return {files:files2, started:true, ...rest}
        }
    }
}
function viewDownload(state:Download, actions:DownloadActions) {
    function wrapUrl(url:string):string {
        const parser = document.createElement('a')
        parser.href = url
        const pathElems = parser.pathname.split("/")
        const oid = (pathElems[0] === "") ? pathElems[2] : pathElems[1]  // for IE11
        const keyHex = window.location.hash.slice(1)
        const key = hexToBin(keyHex)
        const hash = sha256.array(key)
        const hashHex = binToHex(hash)
        const base = ('serviceWorker' in navigator) ? '/' : 'https://flowy.jp/'
        return base + `fe/proxy/${oid}/${keyHex}/${hashHex}` + parser.search
    }
    return (
        <div>
            <div class="frame">
                <div class="frame-header">ファイルの受信</div>
                <div class="frame-body" key="download" oncreate={oncreate}>
                    <div class="frame-main no-footer">
                        <p class="title">下記のファイルをダウンロードできます。</p>
                        <div class="control">
                            <label for="">ファイル</label>
                            {state.files.map((file, idx) => (
                                <a href={wrapUrl(file.url)} key={idx} onclick={() => (actions.getFile(idx), true)} class={`download ${file.downloaded ? 'downloaded' : ''}`}>{file.name}<span class="meta">({showSize(file.size)})</span></a>
                            ), state.files)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


interface State {
    setup :Setup, 
    download :Download
}
interface Actions {
    setup :SetupActions, 
    download :DownloadActions
}
function createInitialState():State {
    return {
        setup: createInitialSetup(), 
        download: null
    }
}
function createActions(api:ApiClient):Actions {
    return {
        setup: createSetupActions(api), 
        download: createDownloadActions()
    }
}
type View<S,A> = (s:S, a:A) => JSX.Element
function view(state:State, actions:Actions) {
    function maybeView<S,A>(state:S, actions:A, view:View<S,A>) {
        if (state !== null && state['tag']) {
            return view(state, actions)
        } else {
            return null
        }
    }
    return (maybeView(state.download, actions.download, viewDownload) || 
            maybeView(state.setup, actions.setup, viewSetup))
}

let allActions
window.addEventListener('load', () => {
allActions = app(createInitialState(), createActions(createApiClient()), view, document.getElementById('receiver'))
})

