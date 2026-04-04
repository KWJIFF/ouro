/**
 * Internationalization System
 * 
 * Ouro operates in the user's language, automatically detected from signals.
 * All system messages, errors, and clarification questions are localized.
 * Constitutional: Zero Friction means the system speaks your language.
 */

type Locale = 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru' | 'ar' | 'pt';

interface Translation {
  [key: string]: string;
}

const translations: Record<Locale, Translation> = {
  en: {
    'signal.captured': 'Signal captured',
    'signal.processing': 'Processing your signal...',
    'signal.completed': 'Done! Here\'s what I created.',
    'signal.failed': 'Something went wrong. I\'ll try another approach.',
    'intent.clarification': 'I want to make sure I understand you correctly.',
    'intent.create': 'Creating',
    'intent.modify': 'Modifying',
    'intent.explore': 'Researching',
    'intent.capture': 'Captured and saved',
    'intent.connect': 'Connecting ideas',
    'intent.compose': 'Composing from multiple sources',
    'feedback.accept': 'Great, glad that works!',
    'feedback.modify': 'Got it, I\'ll adjust.',
    'feedback.reject': 'Understood. I\'ll try a different approach.',
    'evolution.phase.symbiosis': 'Learning from you',
    'evolution.phase.dominance': 'Anticipating your needs',
    'evolution.phase.autonomy': 'Generating independently',
    'error.generic': 'An unexpected error occurred.',
    'error.tool_not_found': 'Tool not available. I\'ll use an alternative.',
    'error.ai_provider': 'AI service temporarily unavailable. Using fallback.',
    'offline.queued': 'You\'re offline. Signal saved and will sync when connected.',
    'offline.synced': 'Back online! Synced {count} queued signals.',
  },
  zh: {
    'signal.captured': '信号已捕获',
    'signal.processing': '正在处理你的信号...',
    'signal.completed': '完成！这是我创建的内容。',
    'signal.failed': '出了点问题。我会尝试其他方法。',
    'intent.clarification': '我想确认我正确理解了你的意思。',
    'intent.create': '正在创建',
    'intent.modify': '正在修改',
    'intent.explore': '正在研究',
    'intent.capture': '已捕获并保存',
    'intent.connect': '正在连接想法',
    'intent.compose': '正在从多个来源合成',
    'feedback.accept': '很好，很高兴这个有用！',
    'feedback.modify': '明白了，我来调整。',
    'feedback.reject': '了解。我会尝试不同的方法。',
    'evolution.phase.symbiosis': '正在向你学习',
    'evolution.phase.dominance': '正在预判你的需求',
    'evolution.phase.autonomy': '独立生成中',
    'error.generic': '发生了意外错误。',
    'error.tool_not_found': '工具不可用。我会使用替代方案。',
    'error.ai_provider': 'AI 服务暂时不可用。使用备用方案。',
    'offline.queued': '你当前离线。信号已保存，连接后将自动同步。',
    'offline.synced': '已重新上线！同步了 {count} 个排队的信号。',
  },
  ja: {
    'signal.captured': 'シグナルをキャプチャしました',
    'signal.processing': 'シグナルを処理中...',
    'signal.completed': '完了！作成したものはこちらです。',
    'signal.failed': '問題が発生しました。別のアプローチを試みます。',
    'intent.clarification': '正しく理解しているか確認させてください。',
    'intent.create': '作成中',
    'intent.modify': '修正中',
    'intent.explore': '調査中',
    'intent.capture': 'キャプチャして保存しました',
    'intent.connect': 'アイデアを接続中',
    'intent.compose': '複数のソースから合成中',
    'feedback.accept': '良かったです！',
    'feedback.modify': '了解しました、調整します。',
    'feedback.reject': '了解しました。別のアプローチを試みます。',
    'evolution.phase.symbiosis': 'あなたから学習中',
    'evolution.phase.dominance': 'あなたのニーズを予測中',
    'evolution.phase.autonomy': '独立して生成中',
    'error.generic': '予期しないエラーが発生しました。',
    'error.tool_not_found': 'ツールが利用できません。代替を使用します。',
    'error.ai_provider': 'AIサービスが一時的に利用できません。フォールバックを使用します。',
    'offline.queued': 'オフラインです。シグナルは保存され、接続時に同期されます。',
    'offline.synced': 'オンラインに戻りました！{count}件のシグナルを同期しました。',
  },
  ko: {
    'signal.captured': '신호가 캡처되었습니다',
    'signal.processing': '신호를 처리 중...',
    'signal.completed': '완료! 생성한 결과입니다.',
    'signal.failed': '문제가 발생했습니다. 다른 방법을 시도하겠습니다.',
    'intent.clarification': '정확히 이해했는지 확인하고 싶습니다.',
    'intent.create': '생성 중',
    'intent.modify': '수정 중',
    'intent.explore': '조사 중',
    'intent.capture': '캡처하여 저장했습니다',
    'intent.connect': '아이디어 연결 중',
    'intent.compose': '여러 소스에서 합성 중',
    'feedback.accept': '잘 되었네요!',
    'feedback.modify': '알겠습니다, 조정하겠습니다.',
    'feedback.reject': '알겠습니다. 다른 방법을 시도하겠습니다.',
    'error.generic': '예기치 않은 오류가 발생했습니다.',
    'offline.queued': '오프라인입니다. 신호가 저장되었으며 연결 시 동기화됩니다.',
    'offline.synced': '온라인으로 돌아왔습니다! {count}개의 신호를 동기화했습니다.',
  },
  es: {
    'signal.captured': 'Señal capturada',
    'signal.processing': 'Procesando tu señal...',
    'signal.completed': '¡Listo! Esto es lo que creé.',
    'signal.failed': 'Algo salió mal. Intentaré otro enfoque.',
    'intent.clarification': 'Quiero asegurarme de entenderte correctamente.',
    'intent.create': 'Creando',
    'intent.modify': 'Modificando',
    'intent.explore': 'Investigando',
    'intent.capture': 'Capturado y guardado',
    'feedback.accept': '¡Genial, me alegro que funcione!',
    'feedback.modify': 'Entendido, lo ajustaré.',
    'feedback.reject': 'Entendido. Intentaré un enfoque diferente.',
    'error.generic': 'Ocurrió un error inesperado.',
    'offline.queued': 'Estás sin conexión. La señal se guardó y se sincronizará al reconectar.',
  },
  fr: {
    'signal.captured': 'Signal capturé',
    'signal.processing': 'Traitement de votre signal...',
    'signal.completed': 'Terminé ! Voici ce que j\'ai créé.',
    'signal.failed': 'Quelque chose a mal tourné. Je vais essayer une autre approche.',
    'intent.clarification': 'Je veux m\'assurer de bien vous comprendre.',
    'intent.create': 'Création en cours',
    'intent.modify': 'Modification en cours',
    'intent.explore': 'Recherche en cours',
    'intent.capture': 'Capturé et sauvegardé',
    'feedback.accept': 'Super, content que ça fonctionne !',
    'feedback.modify': 'Compris, je vais ajuster.',
    'feedback.reject': 'Compris. Je vais essayer une approche différente.',
    'error.generic': 'Une erreur inattendue s\'est produite.',
    'offline.queued': 'Vous êtes hors ligne. Le signal est sauvegardé et sera synchronisé à la reconnexion.',
  },
  de: {
    'signal.captured': 'Signal erfasst',
    'signal.processing': 'Verarbeite dein Signal...',
    'signal.completed': 'Fertig! Hier ist, was ich erstellt habe.',
    'signal.failed': 'Etwas ist schiefgelaufen. Ich versuche einen anderen Ansatz.',
    'intent.clarification': 'Ich möchte sicherstellen, dass ich dich richtig verstanden habe.',
    'intent.create': 'Erstelle',
    'intent.modify': 'Ändere',
    'intent.explore': 'Recherchiere',
    'intent.capture': 'Erfasst und gespeichert',
    'feedback.accept': 'Super, freut mich dass es funktioniert!',
    'feedback.modify': 'Verstanden, ich passe es an.',
    'feedback.reject': 'Verstanden. Ich versuche einen anderen Ansatz.',
    'error.generic': 'Ein unerwarteter Fehler ist aufgetreten.',
    'offline.queued': 'Du bist offline. Das Signal wurde gespeichert und wird bei Verbindung synchronisiert.',
  },
  ru: {
    'signal.captured': 'Сигнал захвачен',
    'signal.processing': 'Обрабатываю ваш сигнал...',
    'signal.completed': 'Готово! Вот что я создал.',
    'signal.failed': 'Что-то пошло не так. Попробую другой подход.',
    'intent.clarification': 'Хочу убедиться, что правильно вас понял.',
    'intent.create': 'Создаю',
    'intent.modify': 'Изменяю',
    'intent.explore': 'Исследую',
    'intent.capture': 'Захвачено и сохранено',
    'feedback.accept': 'Отлично, рад что подошло!',
    'feedback.modify': 'Понял, скорректирую.',
    'feedback.reject': 'Понял. Попробую другой подход.',
    'error.generic': 'Произошла непредвиденная ошибка.',
    'offline.queued': 'Вы офлайн. Сигнал сохранён и будет синхронизирован при подключении.',
  },
  ar: {
    'signal.captured': 'تم التقاط الإشارة',
    'signal.processing': 'جاري معالجة إشارتك...',
    'signal.completed': 'تم! إليك ما أنشأته.',
    'signal.failed': 'حدث خطأ ما. سأجرب طريقة أخرى.',
    'intent.clarification': 'أريد التأكد من فهمك بشكل صحيح.',
    'intent.create': 'جاري الإنشاء',
    'intent.modify': 'جاري التعديل',
    'intent.explore': 'جاري البحث',
    'intent.capture': 'تم الالتقاط والحفظ',
    'error.generic': 'حدث خطأ غير متوقع.',
    'offline.queued': 'أنت غير متصل. تم حفظ الإشارة وستتم المزامنة عند الاتصال.',
  },
  pt: {
    'signal.captured': 'Sinal capturado',
    'signal.processing': 'Processando seu sinal...',
    'signal.completed': 'Pronto! Aqui está o que criei.',
    'signal.failed': 'Algo deu errado. Vou tentar outra abordagem.',
    'intent.clarification': 'Quero ter certeza de que entendi corretamente.',
    'intent.create': 'Criando',
    'intent.modify': 'Modificando',
    'intent.explore': 'Pesquisando',
    'intent.capture': 'Capturado e salvo',
    'feedback.accept': 'Ótimo, fico feliz que funcionou!',
    'feedback.modify': 'Entendi, vou ajustar.',
    'feedback.reject': 'Entendi. Vou tentar uma abordagem diferente.',
    'error.generic': 'Ocorreu um erro inesperado.',
    'offline.queued': 'Você está offline. O sinal foi salvo e será sincronizado ao reconectar.',
  },
};

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const translation = translations[currentLocale]?.[key] || translations.en[key] || key;
  if (!params) return translation;

  return translation.replace(/\{(\w+)\}/g, (_, k) => String(params[k] || `{${k}}`));
}

export function detectLocale(text: string): Locale {
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  if (/[\u0400-\u04ff]/.test(text)) return 'ru';
  if (/[\u0600-\u06ff]/.test(text)) return 'ar';
  // Heuristic for European languages
  if (/\b(el|la|los|las|del|una|pero|porque|también)\b/i.test(text)) return 'es';
  if (/\b(le|la|les|des|une|mais|aussi|avec|pour)\b/i.test(text)) return 'fr';
  if (/\b(der|die|das|ein|und|aber|auch|für|mit)\b/i.test(text)) return 'de';
  if (/\b(também|não|são|está|isso|preciso|porque|obrigado)\b/i.test(text)) return 'pt';
  return 'en';
}

export function getSupportedLocales(): Array<{ code: Locale; name: string }> {
  return [
    { code: 'en', name: 'English' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ru', name: 'Русский' },
    { code: 'ar', name: 'العربية' },
    { code: 'pt', name: 'Português' },
  ];
}
