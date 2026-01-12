import i18next from 'i18next'
import en from './en/common.json'
import kn from './kn/common.json'
i18next.init({
    lng:'kn',
    resources:{
        en: {translation: en},
        kn: {translation: kn}
    }
})
export default i18next;