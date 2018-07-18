import { Cons} from "./adt";
import { h, app } from "hyperapp";
import xhr from 'xhr';
import { append, remove, find, findIndex } from 'ramda';
import { oncreate, onremove, validateBody, invalidateBody, trigger } from './utils';
import { Problem, problem, noProblem, putDetail, showDetail, putParam, showParam } from './problem';
import * as C from './config'


/* [domain] ApiClient --------------------------------- */
type SignupFormCallback = (c:{result:boolean,body:any}) => (s:SignupForm, a:SignupFormActions) => SignupForm|{};
type MonitorCallback = (body:any) => (s:Monitor, a:MonitorActions) => Monitor;
type LoginFormCallback = (c:{result:boolean, body:any}) => (s:LoginForm, a:LoginFormActions) => LoginForm|{};
type LogoutCallback = (body:any) => (s:Logout, a:LogoutActions) => Logout|{};
type FeedbackCallback = (result:boolean) => (s:FeedbackForm, a:FeedbackFormActions) => FeedbackForm|{}
interface ApiClient {
    emailCheck: (s:SignupForm, k:SignupFormCallback) => void, 
    signup: (s:SignupForm, k:SignupFormCallback) => void, 
    monitor: (k:MonitorCallback) => void, 
    login: (s:LoginForm, k:LoginFormCallback) => void, 
    logout: (k:LogoutCallback) => void, 
    feedback: (c:string, k:FeedbackCallback) => void
}

/* [infra] XhrApiClient --------------------- */
const createXhrApiClient = () => (
    {
        emailCheck: (form :SignupForm, k :SignupFormCallback) => {
            xhr({
                url: C.API_BASE + '/emails', 
                method: 'POST', 
                json: true, 
                body: {
                    email: form.email.trim()
                }, 
                withCredentials: true
            }, (err, res, body) => {
                k({result:res.statusCode == 200, body:body})
            })
        }, 
        signup: (form: SignupForm, k :SignupFormCallback) => {
            xhr({
                url: C.API_BASE + '/users', 
                method: 'POST', 
                json: true, 
                body: {
                    email: form.email.trim(), 
                    pw: form.password.trim(), 
                    code: form.code.trim()
                }, 
                withCredentials: true, 
                responseType: 'json'
            }, (err, res, body) => {
                k({result:res.statusCode == 200, body:body})
            })
        }, 
        monitor: (k :MonitorCallback) => {
            xhr({
                url: C.API_BASE + '/user', 
                method: 'GET', 
                withCredentials: true, 
                responseType: 'json', 
                json: true
            }, (err, res, body) => {
                k(body)
            })
        }, 
        login: (form :LoginForm, k :LoginFormCallback) => {
            xhr({
                url: C.API_BASE + '/login', 
                method: 'PUT', 
                json: true, 
                body: {
                    email: form.email.trim(), 
                    password: form.password.trim()
                }, 
                withCredentials: true, 
                responseType: 'json', 
            }, (err, res, body) => {
                k({result:res.statusCode == 200, body:body})
            })
        }, 
        logout: (k :LogoutCallback) => {
            xhr({
                url: C.API_BASE + '/login', 
                method: 'DELETE', 
                withCredentials: true, 
                responseType: 'json', 
            }, (err, res, body) => {
                if (typeof body === 'string') {
                    body = JSON.parse(body)
                }
                k(body)
            })
        }, 
        feedback: (c :string, k :FeedbackCallback) => {
            xhr({
                url: C.API_BASE + '/feedbacks', 
                method: 'POST', 
                withCredentials: true, 
                json: true, 
                body: {
                    content: c
                }
            }, (err, res, body) => {
                k(res.statusCode == 200)
            })
        }
    }
)

/* Notification ------------------------------------ */
interface Message {
    cls: string, 
    txt: string, 
    id: number
}
interface Notification extends Cons {
    tag: "Notification", 
    msg: Message|null,  // non-null if some notification is shown.
    queue: Message[],   // deferred messages
    serial: number
}
interface NotificationActions {
    addFine: (txt:string) => (s:Notification, a:NotificationActions) => Notification|null, 
    addPoor: (txt:string) => (s:Notification, a:NotificationActions) => Notification|null, 
    pick: () => (s:Notification, a:NotificationActions) => Notification|null, 
    dispose: (id:number) => (s:Notification, a:NotificationActions) => Notification|null
}
const createNotificationActions = ():NotificationActions => (
    {
        addFine: (txt) => ({queue, serial, ...rest}, actions) => {
            window.requestAnimationFrame(actions.pick)
            return {queue: append({cls:'fine', txt:txt, id:serial}, queue), serial:serial + 1, ...rest}
        }, 
        addPoor: (txt) => ({queue, serial, ...rest}, actions) => {
            window.requestAnimationFrame(actions.pick)
            return {queue: append({cls:'poor', txt:txt, id:serial}, queue), serial:serial + 1, ...rest}
        }, 
        pick: () => ({msg, queue, ...rest}, actions) => {
            if (!msg && queue.length > 0) {
                const msg2 = queue[0];
                const queue2 = remove(0, 1, queue)
                window.setTimeout(() => actions.dispose(msg2.id), 5000)
                return {msg:msg2, queue:queue2, ...rest}
            } else {
                return null
            }
        }, 
        dispose: (id) => ({msg, ...rest}, actions) => {
            if (msg && msg.id === id) {
                window.setTimeout(() => actions.pick(), 500)
                return {msg:null, ...rest}
            } else {
                return null;
            }
        }
    }
)
const viewNotification = (state:Notification, actions:NotificationActions) => {
    if (state.msg) {
        return (
            <div class={`notification oncreate ${state.msg.cls}`} key={state.msg.id} oncreate={oncreate} onremove={onremove}>
                <p>{state.msg.txt}</p>
            </div>
        )
    }
}

/* [domain] SignupForm ----------------------------- */
const checkEmail = (email) => {
    if (email === "") {
        return 'メールアドレスを入力してください。'
    } else if (! email.match(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/)) {
        return 'メールアドレスは半角英数字で入力してください。'
    } else {
        return null
    }
}
const checkPassword = (password) => {
    if (password === '') {
        return 'パスワードを入力してください。'
    } else if (! password.match(/^[\u0020-\u007e]{6,}$/)) {
        return 'パスワードは半角6文字以上にしてください。'
    } else {
        return null
    }
}
const checkPassword2 = (password2, password) => {
    if (password2 === '') {
        return 'パスワード（確認）を入力してください。'
    } else if (password2 !== password) {
        return 'パスワード（確認）がパスワードと異なります。'
    } else {
        return null
    }
}
const checkConfirmed = (confirmed) => {
    if (confirmed) {
        return null
    } else {
        return '利用規約にご同意ください。'
    }
}
const checkCode = (code) => {
    if (code === "") {
        return '認証コードを入力してください。'
    } else {
        return null
    }
}
interface SignupForm extends Cons {
    tag: "SignupForm", 
    step: number, 
    email :string, 
    password :string, 
    password2 :string, 
    confirmed: boolean, 
    code: string, 
    loading :boolean, 
    problem :Problem
}
interface SignupFormActions {
    create: () => (s:SignupForm, a:SignupFormActions) => SignupForm, 
    change: (e:Event) => (s:SignupForm, a:SignupFormActions) => SignupForm, 
    check: (e:Event) => (s:SignupForm, a:SignupFormActions) => SignupForm, 
    next: () => (s:SignupForm, a:SignupFormActions) => void, 
    nextP: () => (s:SignupForm, a:SignupFormActions) => SignupForm, 
    nextK: (c:{result:boolean, body:any}) => (s:SignupForm, a:SignupFormActions) => SignupForm|{}, 
    submit: () => (s:SignupForm, a:SignupFormActions) => void, 
    submitP: () => (s:SignupForm, a:SignupFormActions) => SignupForm, 
    submitK: (c:{result:boolean, body:any}) => (s:SignupForm, a:SignupFormActions) => SignupForm|{}, 
    back: () => (s:SignupForm, a:SignupFormActions) => SignupForm, 
    dispose: () => (s:SignupForm, a:SignupFormActions) => {}
}
const createSignupFormActions = (cli :ApiClient):SignupFormActions => (
    {
        create: () => (state, actions) => {
            trigger('pageView', {'page':'/signup/input','title':'ユーザ登録'})
            return {tag:"SignupForm", step:0, email:"", password:"", password2:"", confirmed:false, code:"", loading:false, problem:problem()}
        }, 
        change: (e) => (state, actions) => {
            const el = e.target as HTMLInputElement
            if (el.name == 'email') {
                const {email, ...rest} = state
                return {email:el.value, ...rest}
            } else if (el.name == 'password') {
                const {password, ...rest} = state
                return {password:el.value, ...rest}
            } else if (el.name == 'password2') {
                const {password2, ...rest} = state
                return {password2:el.value, ...rest}
            } else if (el.name == 'confirmed') {
                const {confirmed, ...rest} = state
                return {confirmed:el.checked, ...rest}
            } else if (el.name == 'code') {
                const {code, ...rest} = state
                return {code:el.value, ...rest}
            }
            throw new Error('SignupForm.change: no choice ' + e)
        }, 
        check: (e) => ({problem, ...rest}, actions) => {
            const el = e.target as HTMLInputElement
            if (el.name == 'email') {
                const problem2 = putParam('email', checkEmail(rest.email.trim()), problem)
                return {problem:problem2, ...rest}
            } else if (el.name == 'password') {
                const problem2 = putParam('password', checkPassword(rest.password.trim()), problem)
                return {problem:problem2, ...rest}
            } else if (el.name == 'password2') {
                const problem2 = putParam('password2', checkPassword2(rest.password2.trim(), rest.password.trim()), problem)
                return {problem:problem2, ...rest}
            } else if (el.name == 'confirmed') {
                const problem2 = putParam('confirmed', checkConfirmed(rest.confirmed), problem)
                return {problem:problem2, ...rest}
            } else if (el.name == 'code') {
                const problem2 = putParam('code', checkCode(rest.code.trim()), problem)
                return {problem:problem2, ...rest}
            }
            throw new Error('SignupForm.check: no choice ' + e)
        }, 
        next: () => (state, actions) => {
            const p0 = putParam('email', checkEmail(state.email.trim()), problem())
            const p1 = putParam('password', checkPassword(state.password.trim()), p0)
            const p2 = putParam('password2', checkPassword2(state.password2.trim(), state.password.trim()), p1)
            const p3 = putParam('confirmed', checkConfirmed(state.confirmed), p2)
            if (! noProblem(p3)) {
                const {problem, ...rest} = state
                return {problem:p3, ...rest}
            } else {
                actions.nextP();
                return cli.emailCheck(state, actions.nextK)
            }
        }, 
        nextP: () => ({loading:_, problem:_2, ...rest}, actions) => (
            {loading:true, problem:problem(), ...rest}
        ), 
        nextK: ({result, body}) => (state, actions) => {
            if (result) {
                trigger('pageView', {'page':'/signup/auth','title':'ユーザ登録'})
                const {loading:_, step:_2, ...rest} = state
                return {loading:false, step:1, ...rest}
            } else {
                const {loading:_, problem:_2, ...rest} = state
                return {loading:false, problem:problem(body), ...rest}
            }
        }, 
        submit: () => (state, actions) => {
            const p0 = putParam('code', checkCode(state.code), problem())
            if (! noProblem(p0)) {
                const {problem, ...rest} = state
                return {problem:p0, ...rest}
            } else {
                actions.submitP();
                return cli.signup(state, actions.submitK)
            }
        }, 
        submitP: () => ({loading:_, problem:_2, ...rest}, actions) => (
            {loading:true, problem:problem(), ...rest}
        ), 
        submitK: ({result, body}) => (state, actions) => {
            if (result) {
                trigger('pageView', {'page':'/signup/done','title':'ユーザ登録'})
                trigger('userEntered', body)
                trigger('notifyFine', 'ユーザ登録を完了しました。')
                window.setTimeout(() => trigger('pageView'), 500)  // back to real page
                return {tag:""}
            } else {
                const {loading:_, problem:_2, ...rest} = state
                return {loading:false, problem:problem(body), ...rest}
            }
        }, 
        back: () => ({step, problem:_, ...rest}, actions) => {
            trigger('pageView', {'page':'/signup/input','title':'ユーザ登録'})
            return {step:0, problem:problem(), ...rest}
        }, 
        dispose: () => (state, actions) => {
            window.setTimeout(() => trigger('pageView'), 500)  // back to real page
            return {tag:""}
        }, 
    }
)
const viewSignupForm = (state:SignupForm, actions:SignupFormActions) => {
    if (! state.tag) return;
    if (state.step == 0) { return (
        <div class="overlay oncreate" key="signupOverlay" onclick={function (e) {if (e.target === e.currentTarget) actions.dispose()}} oncreate={(e) => (oncreate(e), invalidateBody())} onremove={(e,d) => (onremove(e,d), validateBody())}>
            <div class={`modal ${state.loading && 'loading'} signup-modal`}><form onsubmit={(e) => {e.preventDefault();return false}}>
                <div class="modal-header">ユーザ登録</div>
                <div class="modal-body step0 oncreate" key="step0" oncreate={oncreate} onremove={onremove}>
                    {showDetail(state.problem, (d) => <div class="alert">{d}</div>)}
                    <div class="control">
                        <label for="">メールアドレス</label>
                        <input type="text" name="email" value={state.email} onkeyup={actions.change} onblur={actions.check} class={`${showParam('email', state.problem, () => 'poor')} default-input`}  />
                        <small>お間違いの無いようご注意ください。<br />{showParam('email', state.problem, e => <span class="poor">{e}</span>)}</small>
                    </div>
                    <div class="control">
                        <label for="">パスワード</label>
                        <input type="password" name="password" value={state.password} onkeyup={actions.change} onblur={actions.check} class={showParam('password', state.problem, () => 'poor')} />
                        <small>ログインパスワードを決めてください。<br />{showParam('password', state.problem, (e) => <span class="poor">{e}</span>)}</small>
                    </div>
                    <div class="control">
                        <label for="">パスワード（確認）</label>
                        <input type="password" name="password2" value={state.password2} onkeyup={actions.change} onblur={actions.check} class={showParam('password2', state.problem, () => 'poor')} />
                        <small>{showParam('password2', state.problem, (e) => <span class="poor">{e}</span>)}</small>
                    </div>
                    <div class="control">
                        <label><input type="checkbox" name="confirmed" checked={state.confirmed ? 'checked' : ''} onchange={actions.change} onblur={actions.check} /><span><a href="/tos.html" target="_blank">利用規約</a>に同意する</span></label>
                        <small>{showParam('confirmed', state.problem, (e) => <span class="poor">{e}</span>)}</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick={() => actions.dispose()} disabled={state.loading ? 'true' : ''}>キャンセル</button>
                    <button type="submit" onclick={() => actions.next()} disabled={state.loading ? 'true' : ''} class="">次へ</button>
                </div>
            </form></div>
        </div>
    )} else if (state.step == 1) { return (
        <div class="overlay oncreate" key="signupOverlay" onclick={function (e) {if (e.target === e.currentTarget) actions.dispose()}} oncreate={(e) => (oncreate(e), invalidateBody())} onremove={(e,d) => (onremove(e,d), validateBody())}>
            <div class={`modal ${state.loading && 'loading'} signup-modal`}><form onsubmit={(e) => {e.preventDefault();return false}}>
                <div class="modal-header">ユーザ登録</div>
                <div class="modal-body step1 oncreate" key="step1" oncreate={oncreate} onremove={onremove}>
                    {showDetail(state.problem, (d) => <div class="alert">{d}</div>)}
                    <p>入力されたメールアドレスに認証コードをお送りしました。<br />
                    届いた認証コードを入力して、ユーザ登録を完了してください。</p>
                    <div class="control">
                        <label for="">認証コード</label>
                        <input type="text" name="code" value={state.code} onkeyup={actions.change} onblur={actions.check} class={`${showParam('email', state.problem, () => 'poor')} default-input`}  />
                        <small>複数行で表示されている場合があります。ご注意ください。<br />{showParam('code', state.problem, e => <span class="poor">{e}</span>)}</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick={() => actions.dispose()} disabled={state.loading ? 'true' : ''}>キャンセル</button>
                    <button type="button" onclick={() => actions.back()} disabled={state.loading ? 'true' : ''}>戻る</button>
                    <button type="submit" onclick={() => actions.submit()} disabled={state.loading ? 'true' : ''}>登録する</button>
                </div>
            </form></div>
        </div>
    )}
}


/* LoginForm -------------------------- */
interface LoginForm {
    tag: "LoginForm", 
    email: string, 
    password: string, 
    loading :boolean, 
    problem :Problem
}

interface LoginFormActions {
    create: () => (s:LoginForm, a:LoginFormActions) => LoginForm, 
    change: (e:Event) => (s:LoginForm, a:LoginFormActions) => LoginForm, 
    submit: () => (s:LoginForm, a:LoginFormActions) => void, 
    submitP: () => (s:LoginForm, a:LoginFormActions) => LoginForm, 
    submitK: (c:{result:boolean, body:any}) => (s:LoginForm, a:LoginFormActions) => LoginForm|{}, 
    dispose: () => (s:LoginForm, a:LoginFormActions) => {}
}
const createLoginFormActions = (cli :ApiClient):LoginFormActions => (
    {
        create: () => (state, actions) => {
            trigger('pageView', {'page':'/login/input','title':'ログイン'})
            return {tag:"LoginForm", email:"", password:"", loading:false, problem:problem()}
        }, 
        change: (e) => (state, actions) => {
            const el = e.target as HTMLInputElement
            if (el.name == 'email') {
                const {email, ...rest} = state
                return {email:el.value, ...rest}
            } else if (el.name == 'password') {
                const {password, ...rest} = state
                return {password:el.value, ...rest}
            }
            throw new Error('LoginForm.change: no choice ' + e)
        }, 
        submit: () => (state, actions) => {
            actions.submitP()
            cli.login(state, actions.submitK)
        }, 
        submitP: () => ({loading:_, problem:_2, ...rest}, actions) => (
            {loading:true, problem:problem(), ...rest}
        ), 
        submitK: ({result, body}) => (state, actions) => {
            if (result) {
                trigger('pageView', {'page':'/login/done','title':'ログイン'})
                trigger('userEntered', body)
                trigger('notifyFine', 'ログインしました。')
                window.setTimeout(() => trigger('pageView'), 500)  // back to real page
                return {tag:""}
            } else {
                const {loading:_, problem:_2, ...rest} = state
                return {loading:false, problem:problem(body), ...rest}
            }
        }, 
        dispose: () => (state, actions) => {
            window.setTimeout(() => trigger('pageView'), 500)  // back to real page
            return {tag:""}
        }
    }
)

const viewLoginForm = (state:LoginForm, actions:LoginFormActions) => {
    if (state.tag) { return (
        <div class="overlay oncreate" key="loginOverlay" onclick={function (e) {if (e.target === e.currentTarget) actions.dispose()}} oncreate={(e) => (oncreate(e), invalidateBody())} onremove={(e,d) => (onremove(e,d), validateBody())}>
            <div class={`modal ${state.loading && 'loading'}`}><form onsubmit={(e) => {e.preventDefault();return false}}>
                <div class="modal-header">ログイン</div>
                <div class="modal-body">
                    {showDetail(state.problem, (d) => <div class="alert">{d}</div>)}
                    <div class="control">
                        <label for="">メールアドレス</label>
                        <input type="text" name="email" value={state.email} onkeyup={actions.change} class="default-input" />
                    </div>
                    <div class="control">
                        <label for="">パスワード</label>
                        <input type="password" name="password" value={state.password} onkeyup={actions.change} />
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick={() => actions.dispose()} disabled={state.loading ? 'true' : ''}>キャンセル</button>
                    <button type="submit" onclick={() => actions.submit()} disabled={state.loading ? 'true' : ''}>ログイン</button>
                </div>
            </form></div>
        </div>
    )}
}


/* logout ------------------------------- */
interface Logout {
    tag: "Logout"
}
interface LogoutActions {
    submit: () => (s:Logout, a:LogoutActions) => void, 
    submitK: (body:any) => (s:Logout, a:LogoutActions) => Logout|{}
}
const createLogoutActions = (cli :ApiClient):LogoutActions => (
    {
        submit: () => (state, actions) => {
            cli.logout(actions.submitK)
        }, 
        submitK: (body) => (state, actions) => {
            trigger('pageView', {'page':'/logout/done','title':'ログアウト'})
            trigger('userLeaved', body)
            trigger('notifyFine', 'ログアウトしました。')
            window.setTimeout(() => trigger('pageView'), 500)  // back to real page
            return {tag:""}
        }
    }
)


/* Feedback -------------------------------- */
interface FeedbackForm extends Cons {
    tag :"Feedback", 
    content :string, 
    errmsg :string, 
    loading :boolean
}
interface FeedbackFormActions {
    create: () => (s:FeedbackForm, a:FeedbackFormActions) => FeedbackForm, 
    change: (e:Event) => (s:FeedbackForm, a:FeedbackFormActions) => FeedbackForm,
    submitP: () => (s:FeedbackForm, a:FeedbackFormActions) => FeedbackForm, 
    submit: () => (s:FeedbackForm, a:FeedbackFormActions) => null|{}, 
    submitK: (result:boolean) => (s:FeedbackForm, a:FeedbackFormActions) => FeedbackForm|{}, 
    dispose: () => (s:FeedbackForm, a:FeedbackFormActions) => FeedbackForm|{}
}
const createFeedbackActions = (cli :ApiClient):FeedbackFormActions => (
    {
        create: () => (state, actions) => {
            trigger('event', {eventCategory:'feedback', eventAction:'init'})
            return {tag:"Feedback", errmsg:"", content:"", loading:false}
        },
        change: (e) => ({content, ...rest}, actions) => {
            return {content:(e.target as HTMLTextAreaElement).value, ...rest}
        }, 
        submitP: () => ({loading, errmsg, ...rest}, actions) => {
            return {loading:true, errmsg:"", ...rest}
        }, 
        submit: () => (state, actions) => {
            if (state.content.trim() == "") {
                // display error
                const {errmsg:_, ...rest} = state
                return {errmsg:"内容が入力されていません。", ...rest}
            } else {
                actions.submitP()
                cli.feedback(state.content, actions.submitK)
                return null
            }
        }, 
        submitK: (result) => (state, actions) => {
            if (result) {
                trigger('notifyFine', '意見の送信を完了しました。')
                trigger('event', {eventCategory:'feedback', eventAction:'finish'})
                return {tag:""}
            } else {
                const {errmsg:_, loading:_2, ...rest} = state
                return {errmsg:"エラーが発生しました。しばらくしてから再度お試しください。", loading:false, ...rest}
            }
        }, 
        dispose: () => (state, actions) => {
            trigger('event', {eventCategory:'feedback', eventAction:'cancel'})
            return {tag:""}
        }
    }
)
const viewFeedbackForm = (state:FeedbackForm, actions:FeedbackFormActions) => {
    if (state.tag) { return (
        <div class="overlay oncreate" key="feedbackOverlay" onclick={function (e) {if (e.target === e.currentTarget) actions.dispose()}} oncreate={(e) => (oncreate(e), invalidateBody())} onremove={(e,d) => (onremove(e,d), validateBody())}>
            <div class={`modal small ${state.loading && 'loading'}`}><form onsubmit={(e) => {e.preventDefault();return false}}>
                <div class="modal-header">ご意見箱</div>
                <div class="modal-body">
                    <div class="modal-main">
                        {state.errmsg && <div class="alert">{state.errmsg}</div>}
                        <p>回答はしません。今後の運営の参考にさせていただきますので、お気軽にお送りください。</p>
                        <div class="control">
                            <label for="">内容</label>
                            <textarea class="default-input" onkeyup={actions.change}>{state.content}</textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" onclick={() => actions.dispose()} disabled={state.loading ? 'true' : ''}>キャンセル</button>
                        <button type="submit" class="primary" onclick={() => actions.submit()} disabled={state.loading ? 'true' : ''}>送信</button>
                    </div>
                </div>
            </form></div>
        </div>
    )}
}


/* [domain] Monitor ----------------------- */
interface Monitor extends Cons {
    tag: "Monitor", 
    info: any, 
    quitSession: boolean, 
    waited: boolean, 
    lastPage: string
}
interface MonitorActions {
    monitor: () => (s:Monitor, a:MonitorActions) => void, 
    monitorK: (body:any) => (s:Monitor, a:MonitorActions) => Monitor, 
    handleUserEnter: (body:any) => (s:Monitor, a:MonitorActions) => Monitor, 
    handleUserLeave: (body:any) => (s:Monitor, a:MonitorActions) => Monitor, 
    getLoginStatus: () => (s:Monitor, a:MonitorActions) => Monitor|void, 
    handleParcelSend: () => (s:Monitor, a:MonitorActions) => Monitor, 
    handlePageView: (opts?:{url:string, title:string}) => (s:Monitor, a:MonitorActions) => Monitor, 
    handleEvent: (data:{eventCategory:string,eventAction:string,eventLabel?:string}) => (s:Monitor, a:MonitorActions) => Monitor
}
const createMonitorActions = (cli:ApiClient):MonitorActions => (
    {
        monitor: () => (monitor, actions) => {
            cli.monitor(actions.monitorK)
        }, 
        monitorK: (body) => (monitor, actions) => {
            if (body['isMember']) {
                trigger('userEntered', body)
            }
            if (monitor.waited) {
                trigger('checkUserResponse', body)
            }
            ga('set', 'dimension2', localStorage.getItem('aclp'))
            ga('set', 'dimension1', body['sendCount'])
            ga('set', 'metric1', body['sendCount'])
            ga('send', 'pageview')
            return {tag:'Monitor', info:body, quitSession:monitor.quitSession, waited:false, lastPage:''}
        }, 
        handleUserEnter: (body) => ({info, ...rest}, a) => {
            ga('set', 'dimension1', body['sendCount'])
            ga('set', 'metric1', body['sendCount'])
            return {info:body, ...rest}
        }, 
        handleUserLeave: (body) => ({info, ...rest}, a) => {
            ga('set', 'dimension1', body['sendCount'])
            ga('set', 'metric1', body['sendCount'])
            return {info:body, ...rest}
        }, 
        getLoginStatus: () => (s, a) => {
            if (s.info === null) {
                const {waited:_, ...rest} = s
                return {waited:true, ...rest}
            } else {
                trigger('checkUserResponse', s.info)
            }
        }, 
        handleParcelSend: () => ({info:{sendCount, ...rest2}, quitSession, ...rest}, a) => {
            const info = {sendCount:sendCount + 1, ...rest2}
            ga('set', 'dimension1', info['sendCount'])
            ga('set', 'metric1', info['sendCount'])
            // カスタムディメンション・カスタム指標が変わったので、ここでGAセッションを切る
            return {info:info, quitSession:true, ...rest}
        }, 
        handlePageView: (opts) => ({quitSession, lastPage, ...rest}, a) => {
            let opts2
            if (typeof opts == 'undefined' || opts === null) {
                opts2 = {}
            } else {
                opts2 = opts
            }
            if (quitSession) {
                opts2['sessionControl'] = 'start'
            }
            const page = opts2['page'] || ''
            if (lastPage != page) {
                ga('send', 'pageview', opts2)
                return {quitSession:false, lastPage:page, ...rest}
            } else {
                return {quitSession:quitSession, lastPage:lastPage, ...rest}
            }
        }, 
        handleEvent: (data) => ({quitSession, ...rest}, a) => {
            if (quitSession) {
                data['sessionControl'] = 'start'
            }
            ga('send', 'event', data)
            return {quitSession:false, ...rest}
        }
    }
)
const viewMonitor = (state:Monitor, actions:MonitorActions) => (
    <div style={{display:"none"}}>
        <p>{JSON.stringify(state.info)}</p>
        <button type="button" onclick={actions.monitor}>更新</button>
    </div>
)


interface State {
    signupForm:SignupForm, 
    loginForm:LoginForm, 
    logout:Logout, 
    monitor:Monitor, 
    notification:Notification, 
    feedbackForm:FeedbackForm
}

interface Actions {
    signupForm:SignupFormActions, 
    loginForm:LoginFormActions, 
    logout:LogoutActions, 
    monitor:MonitorActions, 
    notification:NotificationActions, 
    feedbackForm:FeedbackFormActions
}
const cli = createXhrApiClient()
const actions:Actions = {
    signupForm:createSignupFormActions(cli),
    loginForm:createLoginFormActions(cli), 
    logout:createLogoutActions(cli), 
    monitor:createMonitorActions(cli), 
    notification:createNotificationActions(), 
    feedbackForm:createFeedbackActions(cli)
}


const view = (state :State, actions :Actions) => {
    return (
        <div>
            {viewMonitor(state.monitor, actions.monitor)}
            {viewSignupForm(state.signupForm, actions.signupForm)}
            {viewLoginForm(state.loginForm, actions.loginForm)}
            {viewNotification(state.notification, actions.notification)}
            {viewFeedbackForm(state.feedbackForm, actions.feedbackForm)}
        </div>
    )
}

const initialState = {
    signupForm: {tag:""},  // effective null
    loginForm: {tag:""},  // effective null
    logout: {tag:""},  // effective null
    monitor: {tag:"Monitor", info:null, quitSession:false, waited:false}, 
    notification: {tag:"Notification", serial:1, queue:[], msg:null}, 
    feedbackForm: {tag:""}  // effective null
}

window.addEventListener('load', () => {
const main = app(initialState, actions, view, document.getElementById('common'))
document.body.addEventListener('signupWanted', main.signupForm.create)
document.body.addEventListener('loginWanted', main.loginForm.create)
document.body.addEventListener('logoutWanted', main.logout.submit)
document.body.addEventListener('feedbackWanted', main.feedbackForm.create)
document.body.addEventListener('checkUser', main.monitor.getLoginStatus)
document.body.addEventListener('notifyFine', (e:CustomEvent) => (main.notification.addFine(e.detail)))
document.body.addEventListener('notifyPoor', (e:CustomEvent) => main.notification.addPoor(e.detail))
document.body.addEventListener('userEntered', (e:CustomEvent) => main.monitor.handleUserEnter(e.detail))
document.body.addEventListener('userLeaved', (e:CustomEvent) => main.monitor.handleUserLeave(e.detail))
document.body.addEventListener('parcelSent', (e:CustomEvent) => main.monitor.handleParcelSend())
document.body.addEventListener('pageView', (e:CustomEvent) => main.monitor.handlePageView(e.detail))
document.body.addEventListener('event', (e:CustomEvent) => main.monitor.handleEvent(e.detail))

window.requestAnimationFrame(main.monitor.monitor)

})



interface WorkerNavigator {
	readonly serviceWorker: ServiceWorkerContainer;
}
interface ServiceWorkerContainer {
	register(url: string, options?: ServiceWorkerRegistrationOptions): Promise<ServiceWorkerRegistration>;
}
interface ServiceWorkerRegistrationOptions {
	scope?: string;
}

if ('serviceWorker' in navigator) {
    (navigator['serviceWorker'] as ServiceWorkerContainer).register('/fe/sw.js')
        .then(function (reg) {console.log('SW registered!', reg);})
        .catch(function (err) {console.log('Boo!', err);});
}