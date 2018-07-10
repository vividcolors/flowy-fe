
import { Cons, assem20, assem120, assem020 } from './adt';
import { h, app } from "hyperapp";
import { append, remove, filter, uniq, assoc, find, zipWith, reduce, dissoc, values, insert } from "ramda";
import xhr from 'xhr';
import { XhrUrlConfig } from 'xhr';
import { sha256 } from 'js-sha256';
import { Problem, problem, noProblem, putDetail, showDetail, putParam, showParam } from './problem';
import { oncreate, onremove, validateBody, invalidateBody, trigger, round, showSize, binToHex, hexToBin, binToBase64, callIf } from './utils';
import * as C from './config'
import { Condition, fine, poor, isFine, isPoor} from './condition'




/* basic types ------------------------ */
interface User {
    id :string, 
    isMember :boolean
}
interface Parcel {
    id :string, 
    url :string, 
    senderId :string, 
    files :{name:string, size:number}[], 
    frozen :boolean, 
    dlCount :number
}
interface Question {
    label :string, 
    multiple :boolean, 
    choices :{label:string, value:string, withFreeText?:boolean, next?:string}[], 
    next :string|null
}
interface Survey {
    tag :"Survey", 
    surveyId :string, 
    questions :{[questionId:string]:Question}, 
    initialQuestionId :string
}
interface Poster {
    tag :"Poster", 
    posterId :string, 
    image :string, 
    caption :string, 
    destination :string
}
type Task = Survey | Poster


/* API client ------------------------- */
interface ParcelCreationResult {
    parcel :Parcel, 
    urls :string[], 
    tasks :Task[]
}
type TaskPreparationCallback = (c:Condition<Task, Problem>) => any
type ParcelCreationCallback = (c:Condition<ParcelCreationResult, Problem>) => any
type ParcelFreezingCallback = (c:Condition<Parcel, Problem>) => any
interface ApiClient {
    prepare: (k:TaskPreparationCallback) => void, 
    create: (files:File[], k:ParcelCreationCallback) => void, 
    freeze: (parcelId:string, pw:string, results:Result[], k:ParcelFreezingCallback) => void
}

function createApiClient():ApiClient {
    return {
        prepare: (k:TaskPreparationCallback) => {
            xhr({
                url: C.API_BASE + '/tasks/first', 
                method: 'GET', 
                json: true, 
                withCredentials: true
            }, (err, res, body) => {
                if (res.statusCode == 200) {
                    k(fine(body) as Condition<Task, Problem>)
                } else {
                    k(poor(problem({detail:'エラーが発生しました。はじめからやり直してください。'})) as Condition<Task, Problem>)
                }
            })
        }, 
        create: (files:File[], k:ParcelCreationCallback) => {
            xhr({
                url: C.API_BASE + '/parcels', 
                method: 'POST', 
                json: true, 
                body: files.map(f => ({name:f.name, size:f.size})), 
                withCredentials: true
            }, (err, res, body) => {
                if (res.statusCode == 200) {
                    k(fine(body) as Condition<ParcelCreationResult, Problem>)
                } else {
                    k(poor(problem({detail:'エラーが発生しました。はじめからやり直してください。'})) as Condition<ParcelCreationResult, Problem>)
                }
            })
        }, 
        freeze: (parcelId:string, pw:string, results:Result[], k:ParcelFreezingCallback) => {
            const body = results.map((r:Result) => {
                return {
                    '__selection': ((typeof r.content == 'boolean') ? 'Unknown' : 'Reply'), 
                    'Reply': {data: r.content}
                }
            })
            xhr({
                url: C.API_BASE + '/parcels/' + parcelId, 
                method: 'PUT', 
                json: true, 
                body: {'0': pw, '1': body[0] || null, '__METHOD': 'PATCH'}, 
                withCredentials: true
            }, (err, res ,body) => {
                if (res.statusCode == 200) {
                    k(fine(body) as Condition<Parcel,Problem>)
                } else {
                    k(poor(problem({detail:'エラーが発生しました。ページをリロードしてはじめからやり直してください。'})) as Condition<Parcel,Problem>)
                }
            })
        }
    }
}

/* Depot client -------------------------------- */
type PutCallback = (c:{slot:string}) => any;
type PutProgressCallback = (c:{slot:string, bytesSent:number}) => any
interface DepotClient {
    put: (slot:string, url:string, file:File, key:number[], j:PutProgressCallback, k:PutCallback) => void, 
}

function createDepotClient():DepotClient {
    return {
        put: (slot, url, file, key, j, k) => {
            const req = new XMLHttpRequest()
            const hash = sha256.array(key)
            req.upload.addEventListener('progress', function (e:ProgressEvent) {
                j({slot:slot, bytesSent:e.loaded})
            }, false)
            req.addEventListener('load', function (e) {
                k({slot:slot})
            }, false)
            req.addEventListener('error', function (ev) {
                console.log('put-error**', ev, req)
            }, false)
            req.upload.addEventListener('error', function (ev) {
                console.log('put-error***', ev, req)
            }, false)
            req.open('PUT', url, true)
            req.setRequestHeader("Content-type", "")
            req.setRequestHeader("Content-Length", ""+file.size)
            // 12345678123456781234567812345678
            req.setRequestHeader("x-goog-encryption-algorithm", "AES256")
            req.setRequestHeader("x-goog-encryption-key", binToBase64(key))
            req.setRequestHeader("x-goog-encryption-key-sha256", binToBase64(hash))
            console.log("key", binToHex(key), binToBase64(key))
            console.log("hash", binToHex(hash), binToBase64(hash))
            req.send(file)
        }
    }
}


interface Input {
    tag :"Input", 
    serial :number, 
    status :number,  // 0:INPUTTING, 1:LOADING, 2:DONE
    files :{key:number, value:File}[], 
    pw :string, 
    timeoutId :number, 
    user :User, 
    userStatus :number,  // 0:NONE, 1:LOADING, 2:DONE
    confirmStatus :number,  // 0:NONE, 1:PROMPTING, 2:DONE
    error :Problem, 
    task :Task
}
interface InputActions {
    init: () => (s:Input, a:InputActions) => Input, 
    handleCheckUserResponse: (user:User) => (s:Input, a:InputActions) => Input, 
    prepareTask: (c:Condition<Task, Problem>) => (s:Input, a:InputActions) => Input, 
    addFiles: (f:FileList) => (s:Input, a:InputActions) => Input, 
    removeFile: (i:number) => (s:Input, a:InputActions) => Input, 
    changePw: (e:Event) => (s:Input, a:InputActions) => Input, 
    generatePw: () => (s:Input, a:InputActions) => Input, 
    tick: (ti:number) => (s:Input, a:InputActions) => Input, 
    confirm: () => (s:Input, a:InputActions) => Input, 
    submit: () => (s:Input, a:InputActions) => Input, 
    submitDone: (c:Condition<ParcelCreationResult, Problem>) => (s:Input, a:InputActions) => Input
}
function createInitialInput():Input {
    window.requestAnimationFrame(() => allActions.input.init())
    return {
        tag:"Input", 
        serial:0, 
        status:0, 
        files:[], 
        pw:'', 
        timeoutId: 0, 
        user:null, 
        userStatus: 0, 
        confirmStatus :0, 
        error:problem(), 
        task:null
    }
}
function createInputActions(api:ApiClient):InputActions {
    const checkFile = (file:File) => {
        if (file.size > C.FILESIZE_MAX) {
            return '選択されたファイルのうち2GB超のものが除外されました。'
        } else {
            return null
        }
    }
    const cs = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&@-?.+:*/()=|'
    //const cs = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const cslen = cs.length;
    const pwlen = 8
    const generatePassword = () => {
        let pw = ""
        for (let i = 0; i < pwlen; i++) {
            pw += cs[Math.floor(Math.random() * cslen)]
        }
        return pw
    }
    return {
        init: () => ({userStatus, ...rest}, actions) => {
            const k2 = function (e:CustomEvent) {
                document.body.removeEventListener('checkUserResponse', k2)
                allActions.input.handleCheckUserResponse(e.detail)
            }
            document.body.addEventListener('checkUserResponse', k2)
            trigger('checkUser')
            return {userStatus:1, ...rest}
        }, 
        handleCheckUserResponse: (user) => ({userStatus, user:_, confirmStatus:_2, ...rest}, actions) => {
            const confirmStatus = (user.isMember) ? 2 : 0
            api.prepare(actions.prepareTask)
            return {userStatus:2, user:user, confirmStatus:confirmStatus, ...rest}
        }, 
        prepareTask: (c) => ({task:_, ...rest}, actions) => {
            const task = (isFine(c)) ? c.body as Task : null
            return {task:task, ...rest}
        }, 
        addFiles: (fl) => ({serial, error, files, ...rest}, actions) => {
            if (serial == 0) {
                trigger('pageView', {'page':'/sender/input','title':'ファイルの送信'})
                serial = 1
            }
            const len = fl.length;
            error = putParam('file', null, error)
            for (let i = 0; i < len; i++) {
                const msg = checkFile(fl[i])
                if (msg === null) {
                    files = append({key:serial, value:fl[i]}, files)
                    serial++
                } else {
                    error = putParam('file', msg, error)
                }
            }
            if (noProblem(error) && files.length > C.NUMFILE_MAX) {
                error = putParam('file', '8つ目以降のファイルが除外されました。', error)
                files = files.slice(0, C.NUMFILE_MAX)
            }
            return {files:files, serial:serial, error:error, ...rest}
        }, 
        removeFile: (idx) => ({files, error, ...rest}, actions) => {
            return {files:remove(idx, 1, files), error:putParam('file', null, error), ...rest}
        }, 
        changePw: (e) => ({pw, ...rest}, actions) => {
            const el = e.target as HTMLInputElement
            return {pw:el.value, ...rest}
        }, 
        generatePw: () => ({pw:_, timeoutId, ...rest}, actions) => {
            const pw = generatePassword()
            timeoutId = window.setTimeout(() => actions.tick(timeoutId), 500)
            return {pw:pw, timeoutId:timeoutId, ...rest}
        }, 
        tick: (ti) => ({timeoutId, ...rest}, actions) => {
            if (ti == timeoutId) {
                return {timeoutId:0, ...rest}
            } else {
                return null
            }
        }, 
        confirm: () => ({confirmStatus, ...rest}, actions) => {
            window.requestAnimationFrame(() => actions.submit())
            return {confirmStatus:2, ...rest}
        }, 
        submit: () => (state, actions) => {
            if (state.confirmStatus != 2) {
                // confirmation required
                const {confirmStatus, ...rest} = state
                return {confirmStatus:1, ...rest}
            } else {
                const {status, ...rest} = state
                if (state.task) {
                    window.setTimeout(() => allActions.run.init([state.task]), 800)
                }
                api.create(rest.files.map((f) => f.value), actions.submitDone)
                return {status:1, ...rest}
            }
        }, 
        submitDone: (c) => (state, actions) => {
            if (isPoor(c)) {
                const {error, status, ...rest} = state
                return {error:c.body as Problem, status:0, ...rest}
            } else {
                const r = c.body as ParcelCreationResult
                window.requestAnimationFrame(() => {
                    allActions.upload.init({result:r, input:state})
                })
                const {error, status, ...rest} = state
                return {error:problem(), status:2, ...rest}
            }
        }
    }
}
function viewInput(state:Input, actions:InputActions, runState:Run, runActions:RunActions) {
    function handleOnchange(e) {
        actions.addFiles(e.target.files)
    }
    function handleOnDragOver(e:DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).classList.add('ondrag');
    }
    function handleOnDragLeave(e:DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).classList.remove('ondrag');
    }
    function handleOnDrop(e:DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        (e.target as HTMLElement).classList.remove('ondrag');
        actions.addFiles(e.dataTransfer.files)
    }
    function confirm() {
        if (state.confirmStatus != 1) {
            return null
        }
        return (
            <div class="overlay" key="authOverlay" oncreate={(e) => (oncreate(e), invalidateBody())} onremove={(e,d) => (onremove(e,d), validateBody())}>
                <form onsubmit={(e) => {e.preventDefault();return false}} key="confirmForm">
                    <div class="modal small" key="confirmModal">
                        <div class="modal-header">ご利用にあたって</div>
                        <div class="modal-body">
                            <div class="modal-main">
                                <p>flowyをご利用の際には、<a href="/tos.html" target="_blank">利用規約</a>および<a href="/privacy.html#handling" target="_blank">個人情報の取扱いについて</a>をお読みになりその内容をご承諾ください。</p>
                                <p>flowyでは、ファイルアップロードの間に<b>広告の視聴</b>や<b>アンケートへの回答</b>をお願いしています。<br />
                                これにより快適なサービスを提供できますので、ご承諾をお願いいたします。</p>
                            </div>
                            <div class="modal-footer">
                                <button type="submit" onclick={() => actions.confirm()}>上記を承諾して続ける</button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        )
    }
    return (
        <div>
            {viewRun(runState, runActions)}
            {confirm()}
            <div class={`frame ${state.status == 1 ? 'loading' : ''}`} key="appFrame">
                <div class="frame-header">ファイルの送信</div>
                <div class="frame-body" id="input" key="input" onremove={onremove}>
                    <div class="frame-main">
                        <div class="control">
                            <label for="">ファイル（～2GB、～7個）</label>
                            <div class="file-list">
                                {state.files.map(({key, value}, i) => (
                                    <div class="entry" oncreate={oncreate} onremove={onremove} key={key}><i class="material-icons">file_upload</i> {value.name}<span class="meta">({showSize(value.size)})</span><button onclick={() => actions.removeFile(i)}><i class="material-icons">close</i></button></div>
                                ))}
                                <label><input type="file" multiple value="" onchange={handleOnchange} /><span ondragover={handleOnDragOver} ondragleave={handleOnDragLeave} ondrop={handleOnDrop}>クリックしてファイルを選択<br />or<br />ファイルをドロップ</span></label>
                            </div>
                            <small>{showParam('file', state.error, (e) => <span class="poor">{e}</span>)}</small>
                        </div>
                        <div class="control">
                            <label for="">DLパスワード（設定したい場合のみ入力）</label>
                            <div class="input-with-button">
                                <input type={(state.timeoutId != 0) ? 'text' : 'password'} value={state.pw} onkeyup={actions.changePw} /><button type="button" onclick={() => actions.generatePw()}><i class="material-icons">swap_horiz</i></button>
                            </div>
                            <small>設定されたパスワードはまた後で確認できます。</small>
                        </div>
                    </div>
                    <div class="frame-footer">
                        <button onclick={() => actions.submit()} disabled={(state.files.length > 0 && state.userStatus == 2) ? '' : 'true'}>アップロード</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

type ReplyValue = string | string[]
type Reply = {[name:string]:ReplyValue}
interface Result {
    content :Reply|boolean, 
    count :number
}
interface Run {
    tasks :Task[], 
    results :Result[], 
    index :number, 
    question :string,  // only for Survey
    replies :Reply,  // only for Survey
    reply :ReplyValue,  // only for Survey
    freeText :string,  // only for Survey
    elapsed :number, 
    active :boolean,  // while document is inactive, then stops counting elapsed time.
    runStatus :number,  // 0:INITIAL, 1:RUNNING, 2:DONE
}
interface RunActions {
    init :(tasks:Task[]) => (s:Run, a:RunActions) => Run, 
    start :() => (s:Run, a:RunActions) => Run, 
    skip :() => (s:Run, a:RunActions) => Run, 
    posterClick :() => (s:Run, a:RunActions) => Run, 
    changeQuestionFreeText :(e:Event) => (s:Run, a:RunActions) => Run, 
    changeQuestionChoice :(e:Event) => (s:Run, a:RunActions) => Run, 
    commitQuestion :() => (s:Run, a:RunActions) => Run, 
    stepQuestion :(e:Event) => (s:Run, a:RunActions) =>Run, 
    handleDeactivated :(e:Event) => (s:Run, a:RunActions) => Run, 
    handleActivated :(e:Event) => (s:Run, a:RunActions) => Run
}
function runStatus(state:Run):number {
    return state.runStatus
}
function createRunActions(api:ApiClient):RunActions {
    function incr(i:number, results:Result[]) {
        const r = results[i]
        return insert(i, {count:r.count + 1, content:r.content}, remove(i, 1, results))
    }
    function truth(i:number, results:Result[]) {
        const r = results[i]
        return insert(i, {content:true, count:r.count}, remove(i, 1, results))
    }
    function reply(i:number, rs:Reply, results:Result[]) {
        const r = results[i]
        return insert(i, {content:rs, count:r.count}, remove(i, 1, results))
    }
    function next(state, actions) {
        if (true) {
            let {index, runStatus:_2, results, ...rest} = state
            //window.requestAnimationFrame(allActions.upload.submit)
            results = reply(index, rest.replies, results)
            trigger('taskDone', results)
            return {index:-1, runStatus:2, results:[], ...rest}
        } /*else {
            let {index:_1, elapsed:_2, ...rest} = state as any
            const index = (state.index + 1 % state.tasks.length)
            const t = state.tasks[index]
            if (t.tag == 'Survey') {
                const {question:_a1, replies:_a2, reply:_a3, freeText:_a4, ...rest2} = rest
                const q = t.questions[t.initialQuestionId]
                const reply = (q.multiple) ? [] : null
                rest = {question:t.initialQuestionId, replies:[], reply:reply, freeText:"", ...rest2}
            }
            return {index:index, elapsed:0, ...rest}
        }*/
    }
    return {
        init: (tasks:Task[]) => (state, actions) => {
            const results = tasks.map((t) => ({content:null, count:0}))
            window.requestAnimationFrame(actions.start)
            return {tasks:tasks, results:results, index:-1, question:null, replies:null, reply:null, freeText:null, elapsed:-1, active:false, runStatus:0}
        }, 
        start: () => (state, actions) => {
            let {index:_, elapsed:_2, active:_3, runStatus:_4, results, ...rest} = state as any
            const t = state.tasks[0]
            if (t.tag == 'Survey') {
                trigger('event', {eventCategory:'task',eventAction:'init',eventLabel:t.surveyId})
                const {question:_a1, replies:_a2, reply:_a3, freeText:_a4, ...rest2} = rest
                const q = t.questions[t.initialQuestionId]
                const reply = (q.multiple) ? [] : null
                const replies = {'_surveyId_': (t as Survey).surveyId}
                rest = {question:t.initialQuestionId, replies:replies, reply:reply, freeText:"", ...rest2}
            }
            return {index:0, elapsed:0, active:true, runStatus:1, results:incr(0, results), ...rest}
        }, 
        skip: () => (state, actions) => {
            return next(state, actions)
        }, 
        posterClick: () => (state, actions) => {
            const {results, ...rest} = state as any
            return next({results:truth(rest.index, results), ...rest}, actions)
        }, 
        changeQuestionFreeText: (e) => (state, actions) => {
            const {freeText, reply, ...rest} = state as any
            const s = rest.tasks[rest.index] as Survey 
            const q = s.questions[state.question]
            const el = e.target as HTMLInputElement
            const val = find(x => x.withFreeText, q.choices).value
            if (q.multiple) {
                if (el.value === '') {
                    return {freeText:'', reply:filter(v => v != val, reply as string[]), ...rest}
                } else {
                    return {freeText:el.value, reply:uniq(append(val, reply as string[])), ...rest}
                }
            } else {
                if (el.value === '') {
                    return {freeText:'', reply:null, ...rest}
                } else {
                    return {freeText:el.value, reply:val, ...rest}
                }
            }
        }, 
        changeQuestionChoice: (e) => (state, actions) => {
            const {reply, ...rest} = state as any
            const s = rest.tasks[rest.index] as Survey
            const q = s.questions[rest.question]
            const el = e.target as HTMLInputElement
            if (q.multiple) {
                if (el.checked) {
                    return {reply:append(el.value, reply as string[]), ...rest}
                } else {
                    return {reply:filter(v => v != el.value, reply as string[]), ...rest}
                }
            } else {
                window.setTimeout(actions.stepQuestion, 400)
                return {reply:el.value, ...rest}
            }
        }, 
        commitQuestion: () => (state, actions) => {
            window.setTimeout(actions.stepQuestion, 400)
            return null
        }, 
        stepQuestion: (e) => (state, actions) => {
            let {reply, freeText, replies, question, ...rest} = state as any
            const s = rest.tasks[rest.index] as Survey
            const q = s.questions[question]
            replies = assoc(question, reply, replies)
            if (freeText !== '') {
                replies = assoc(question+'/_freeText_', freeText, replies)
            }
            const qc = find(c => c.value == (reply as string), q.choices)
            if (!q.multiple && (typeof qc.next) == 'string') {
                question = qc.next
            } else {
                question = q.next
            }
            if (question === null) {
                trigger('event', {eventCategory:'task',eventAction:'done',eventLabel:s.surveyId})
                return next({reply:null, freeText:"", replies:replies, question:null, ...rest}, actions)
            } else {
                return {reply:null, freeText:"", replies:replies, question:question, ...rest}
            }
        }, 
        handleDeactivated: (e) => (state, actions) => {
            return null
        }, 
        handleActivated: (e) => (state, actions) => {
            return null
        }
    }
}
function viewRun<R extends Run>(state:R, actions:RunActions) {
    if (state.runStatus != 1) {
        return null
    }
    const t = state.tasks[state.index]
    if (t.tag == 'Survey') {
        const q = t.questions[state.question]
        const nextEnabled = (() => {
            if (q.multiple) {
                return true
            } else {
                return (state.freeText != "")
            }
        })()
        return (
            <div class="survey" key={t.surveyId} oncreate={(e) => (invalidateBody(), oncreate(e))} onremove={(e,d) => (validateBody(), onremove(e,d))}>
                <div class="survey-canvas">
                    <div class="survey-header">アンケートにご回答ください</div>
                    <div class="survey-question" key={state.question} oncreate={oncreate} onremove={onremove}>
                        <div class="survey-main">
                            <p>{q.label}<span class="meta">{`${q.multiple ? '（複数選択可）' : ''}`}</span></p>
                            {q.choices.map((c, idx) => {
                                if (c.withFreeText) {
                                    return (
                                        <div class="control">
                                            <label for="">{c.label}</label>
                                            <input type="text" value={state.freeText} onkeyup={actions.changeQuestionFreeText} />
                                        </div>
                                    )
                                } else if (q.multiple) {
                                    return (
                                        <div class="control">
                                            <label><input type="checkbox" name={state.question} value={c.value} checked={(state.reply !== null && (state.reply as string[]).indexOf(c.value) >= 0) ? 'checked' : ''} onchange={actions.changeQuestionChoice} /><span>{c.label}</span></label>
                                        </div>
                                    )
                                } else {
                                    return (
                                        <div class="control">
                                            <label><input type="radio" name={state.question} value={c.value} checked={(state.reply !== null && (state.reply as string) == c.value) ? 'checked' : ''} onchange={actions.changeQuestionChoice} /><span>{c.label}</span></label>
                                        </div>
                                    )
                                }
                            })}
                        </div>
                        <div class="survey-action">
                            <button onclick={actions.commitQuestion} disabled={(nextEnabled) ? '' : 'true'}>確定する</button>
                        </div>
                    </div>
                </div>
            </div>
        )
    } else if (t.tag == 'Poster') {
        return (
            <a class="poster" href="http://rurubu.travel/?RegistFrom=netma8nmrurp0000006336" target="_blank">
                <div class="poster-canvas" style={{backgroundImage:"url(http://localhost:8000/img/ads/007_jtb_a8.jpg)"}}></div>
                <div class="poster-caption">るるぶトラベル</div>
                <button type="button" class="skip-button" onclick={(e) => {e.preventDefault();return actions.skip()} }>スキップ</button>
            </a>
        )
    }
}

interface UploadJob {
    file :File, 
    url :string, 
    uploadedSize :number, 
}
interface Upload {
    tag :"Upload", 
    parcelId :string, 
    key :number[], 
    pw :string, 
    jobs :UploadJob[], 
    slots :{[slot:string]:UploadJob}, 
    totalSize :number, 
    uploadedSize :number, 
    status :number,  // 0:UPLOADING, 1:LOADING, 2:DONE
    results: Result[], 
    prob :Problem
}
function uploadDone(state:Upload) :boolean {
    const currentSize = reduce((size, job) => size + job.uploadedSize, state.uploadedSize, values(state.slots))
    return (currentSize == state.totalSize)
}
interface UploadActions {
    init: (c:{result:ParcelCreationResult, input:Input}) => (s:Upload, a:UploadActions) => Upload, 
    step: (slot:string) => (s:Upload, a:UploadActions) => Upload, 
    update: (c:{slot:string, bytesSent:number}) => (s:Upload, a:UploadActions) => Upload, 
    done: (c:{slot:string}) => (s:Upload, a:UploadActions) => Upload, 
    taskDone: (e:CustomEvent) => (s:Upload, a:UploadActions) => Upload, 
    submit: () => (s:Upload, a:UploadActions) => Upload, 
    submitDone: (c:Condition<Parcel, Problem>) => (s:Upload, a:UploadActions) => Upload
}
function createUploadActions(api:ApiClient, depot:DepotClient):UploadActions {
    const createJob = (f:{key:number, value:File}, url:string) => {
        return {file:f.value, url:url, uploadedSize:0}
    }
    const keylen = 32
    const generateKey = () => {
        let key = new Array(keylen)
        for (let i = 0; i < keylen; i++) {
            key[i] = Math.floor(Math.random() * 256)
        }
        return key
    }
    /*const generateKey = () => {
        let key = new Array(32)
        for (let j = 0; j < 4; j++) {
            for (let i = 0; i < 8; i++) {
                key[8 * j + i] = 49 + i
            }
        }
        return key
    }*/
    return {
        init: ({result, input}) => (_state, actions) => {
            trigger('pageView', {'page':'/sender/upload','title':'ファイルの送信'})
            const jobs = zipWith(createJob, input.files, result.urls)
            const totalSize = reduce((sum, f) => f.value.size + sum, 0, input.files)
            const slots = {}
            const results = (input.task !== null) ? null : []
            window.requestAnimationFrame(() => actions.step('s0'))
            if (jobs.length > 1) {
                window.requestAnimationFrame(() => actions.step('s1'))
            }
            document.body.addEventListener('taskDone', actions.taskDone)
            const key = generateKey()
            return {tag:"Upload", parcelId:result.parcel.id, pw:input.pw, key:key, jobs:jobs, slots:slots, totalSize:totalSize, uploadedSize:0, status:0, results:results, prob:problem()}
        }, 
        step: (slot) => ({slots, jobs, ...rest}, actions) => {
            if (jobs.length > 0) {
                const job = jobs[0]
                const slots2 = assoc(slot, job, slots)
                const jobs2 = remove(0, 1, jobs)
                depot.put(slot, job.url, job.file, rest.key, actions.update, actions.done)
                return {slots:slots2, jobs:jobs2, ...rest}
            } else {
                if (values(slots).length == 0 && rest.results !== null) {
                    window.requestAnimationFrame(actions.submit)
                }
                return {slots:slots, jobs:jobs, ...rest}
            }
        }, 
        update: ({slot, bytesSent}) => ({slots, ...rest}, actions) => {
            const {uploadedSize:_0, ...jobRest} = slots[slot]
            const job2 = {uploadedSize:bytesSent, ...jobRest}
            const slots2 = assoc(slot, job2, slots)
            return {slots:slots2, ...rest}
        }, 
        done: ({slot}) => ({uploadedSize, slots, ...rest}, actions) => {
            const job = slots[slot]
            const slots2 = dissoc(slot, slots) as {[slot:string]:UploadJob}
            window.requestAnimationFrame(() => actions.step(slot))
            return {uploadedSize:uploadedSize + job.file.size, slots:slots2, ...rest}
        }, 
        taskDone: (e) => ({results:_, ...rest}, actions) => {
            if (rest.jobs.length == 0 && values(rest.slots).length == 0) {
                window.requestAnimationFrame(actions.submit)
            }
            return {results:e.detail as Result[], ...rest}
        }, 
        submit: () => ({status, ...rest}, actions) => {
            api.freeze(rest.parcelId, rest.pw, rest.results, actions.submitDone)
            return {status:1, ...rest}
        }, 
        submitDone: (c) => ({status, prob, ...rest}, actions) => {
            if (isPoor(c)) {
                const e = c.body as Problem
                return {status:2, prob:e, ...rest}
            } else {
                const p = c.body as Parcel
                const url = C.WEB_BASE + '/r/?p=' + p.id + '#' + binToHex(rest.key)
                window.requestAnimationFrame(() => allActions.finish.init({url:url, pw:rest.pw}))
                return {status:2, prob:prob, ...rest}
            }
        }
    }
}
function viewUpload(state:Upload, actions:UploadActions, runState:Run, runActions:RunActions) {
    const rate = (current:number, total:number) => {
        return Math.ceil(current * 100 / total)
    }
    const currentSize = reduce((size, job) => size + job.uploadedSize, state.uploadedSize, values(state.slots))
    const p = Math.round(currentSize * 100 / state.totalSize)
    const withAlert = (f) => {
        if (noProblem(state.prob)) {
            return f(state)
        } else {
            return showDetail(state.prob, (msg) => (
                <p class="alert">{msg}</p>
            ))
        }
    }
    return (
        <div>
            {viewRun(runState, runActions)}
            <div class="frame" key="appFrame">
                <div class="frame-header">ファイルの送信</div>
                <div class="frame-body" id="upload" key="upload" oncreate={oncreate} onremove={onremove}>
                    {withAlert(() => (
                        <div class="frame-main no-footer">
                            <div class="upload-progress">
                                <div class="lead">アップロードしています({showSize(state.totalSize)})</div>
                                <div class="rate"><span>{p}</span>%</div>
                                <div class="bar"><div class="progress"><div class="progress-rate" style={{width:p+'%'}}></div></div></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

interface Finish {
    tag :"Finish", 
    url :string, 
    pw :string
}
interface FinishActions {
    init: (c:{url:string, pw:string}) => (s:Finish, a:FinishActions) => Finish
}
function createFinishActions():FinishActions {
    return {
        init: ({url, pw}) => (_state, actions) => {
            trigger('pageView', {'page':'/sender/finish','title':'ファイルの送信'})
            return {tag:"Finish", url:url, pw:pw}
        }
    }
}
function viewFinish(state:Finish, actions:FinishActions, runState:Run, runActions:RunActions) {
    const copyToClip = (text, name) => {
        var textArea;

        function isiOS() {
            return navigator.userAgent.match(/ipad|iphone/i);
        }

        function createTextArea(text) {
            textArea = document.createElement('textArea');
            textArea.value = text;
            document.getElementById('urlInputs').appendChild(textArea);
        }

        function selectText() {
            var range, selection;

            if (isiOS()) {
                range = document.createRange();
                range.selectNodeContents(textArea);
                selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                textArea.setSelectionRange(0, 999999);
            } else {
                textArea.select();
            }
        }

        function copyToClipboard() {        
            var result = document.execCommand('copy');
            document.getElementById('urlInputs').removeChild(textArea);
            return result;
        }

        createTextArea(text);
        selectText();
        if (copyToClipboard()) {
            trigger('notifyFine', name + 'をコピーしました。');
        } else {
            trigger('notifyPoor', name + 'のコピーに失敗しました');
        }
    }
    return (
        <div>
            <div class="frame" key="appFrame">
                <div class="frame-header">ファイルの送信</div>
                <div class="frame-body" key="done" oncreate={oncreate} >
                    <div class="frame-main no-footer">
                        <div class="upload-done">
                            <p class="title">アップロードが完了しました。</p>
                            <p class="small">下記のURLをファイルの受信者に連絡してください。ファイルの保管期限は1週間です。10回までダウンロードできます。</p>
                            <div class="control">
                                <label for="">ダウンロードURL</label>
                                <div class="input-with-button" id="urlInputs">
                                    <input type="text" id="urlInput" value={state.url} readonly onfocus={(e) => e.target.select()} /><button type="button" onclick={() => copyToClip(state.url, 'URL')}><i class="material-icons">content_copy</i></button>
                                </div>
                            </div>
                            {callIf(typeof state.pw === 'string' && state.pw != "", () =>
                                <div class="control">
                                    <label for="">設定パスワード</label>
                                    <div class="input-with-button">
                                        <input type="password" id="pwInput" value={state.pw} readonly onfocus={(e) => e.target.select()} /><button type="button" onclick={() => copyToClip(state.pw, 'パスワード')}><i class="material-icons">content_copy</i></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        {/* <div class="result">
            アップロードが完了しました。下記のURLを宛先に連絡してください。<br />
            <textarea readonly onfocus={(e) => e.target.select()}></textarea>
        </div> */}
        </div>
    )
}

interface State {
    input :Input, 
    upload :Upload, 
    finish :Finish, 
    run :Run
}
interface Actions {
    input :InputActions, 
    upload :UploadActions, 
    finish :FinishActions, 
    run :RunActions
}
function createInitialState():State {
    return {
        input: createInitialInput(), 
        upload: null, 
        finish: null, 
        run: null
    }
}
function createActions(api:ApiClient, depot:DepotClient):Actions {
    return {
        input: createInputActions(api), 
        upload: createUploadActions(api, depot), 
        finish: createFinishActions(), 
        run: createRunActions(api)
    }
}
type View<S,A> = (s:S, a:A, rs:Run, ra:RunActions) => JSX.Element
function view(state:State, actions:Actions) {
    function maybeView<S,A>(state1:S, actions1:A, view:View<S,A>) {
        if (state1 !== null && state1['tag']) {
            return view(state1, actions1, state.run, actions.run)
        } else {
            return null
        }
    }
    return (maybeView(state.finish, actions.finish, viewFinish) || 
            maybeView(state.upload, actions.upload, viewUpload) ||
            maybeView(state.input, actions.input, viewInput))
}

let allActions
window.addEventListener('load', () => {
allActions = app(createInitialState(), createActions(createApiClient(), createDepotClient()), view, document.getElementById('sender'))
})
