import {ref} from 'vue'
import {API_BASE_URL} from '@/assets/scripts/config.js'

export const isAuth = ref(undefined)

export async function checkAuth() {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/check`, {credentials: 'include'})
        isAuth.value = (await res.json()).success
    } catch {
        isAuth.value = false
    }
}

export async function logout () {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/logout`, {
            credentials: 'include'
        })
        if (res.ok) {
            isAuth.value = false
            return true
        }
        console.error((await res.json()).message)
        return false;
    } catch (err) {
        console.error(err)
        return false
    }
}
