const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso))
}

const plural = new Intl.PluralRules('ru-RU')

// pluralize(5, ['вопрос', 'вопроса', 'вопросов']) -> '5 вопросов'
export function pluralize(n: number, [one, few, many]: [string, string, string]) {
  const form = plural.select(n)
  const word = form === 'one' ? one : form === 'few' ? few : many
  return `${n} ${word}`
}
