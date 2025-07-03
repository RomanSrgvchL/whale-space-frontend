import {createRouter, createWebHistory} from 'vue-router'
import {isAuth, checkAuth} from '@/stores/auth.js'

const Home = () => import('@/views/HomePage.vue')
const Discussions = () => import('@/views/DiscussionsPage.vue')
const Users = () => import('@/views/UsersPage.vue')
const Messages = () => import('@/views/MessagesPage.vue')
const MyProfile = () => import('@/views/MyProfilePage.vue')
const UserProfile = () => import('@/views/UserProfilePage.vue')
const Login = () => import('@/views/LoginPage.vue')
const Registration = () => import('@/views/RegistrationPage.vue')
const Logout = () => import('@/views/LogoutPage.vue')
const Discussion = () => import('@/views/DiscussionPage.vue')
const Chat = () => import('@/views/ChatPage.vue')

const routes = [
    {path: '/home', component: Home, meta: {title: 'Главная'}},
    {path: '/discussions', component: Discussions, meta: {title: 'Обсуждения'}},
    {path: '/users', component: Users, meta: {title: 'Пользователи'}},
    {path: '/messages', component: Messages, meta: {title: 'Сообщения', auth: true}},
    {path: '/profile/me', component: MyProfile, meta: {title: 'Профиль', auth: true}},
    {path: '/profile/:id', component: UserProfile, meta: {title: 'Профиль', auth: true}},
    {path: '/login', component: Login, meta: {title: 'Войти', guest: true}},
    {path: '/registration', component: Registration, meta: {title: 'Зарегистрироваться', guest: true}},
    {path: '/logout', component: Logout, meta: {title: 'Выйти', auth: true}},
    {path: '/discussion/:id', component: Discussion, meta: {title: 'Обсуждение', auth: true}},
    {path: '/chat/:id', component: Chat, meta: {title: 'Чат', auth: true}},
    {path: '/:pathMatch(.*)*', redirect: '/home'}
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach(async (to, from, next) => {
    const needAuth = to.meta.auth
    const needGuest = to.meta.guest

    await checkAuth()

    if (needAuth && !isAuth.value) return next({path: '/login'})
    if (needGuest && isAuth.value) return next({path: '/home'})

    next()
})

router.afterEach(to => {
    document.title = to.meta.title
})

export default router
