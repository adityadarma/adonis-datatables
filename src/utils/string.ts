export default class Str {
  static contains(
    haystack: string,
    needles: string | string[],
    ignoreCase: boolean = false
  ): boolean {
    if (ignoreCase) {
      haystack = haystack.toLowerCase()
    }

    if (!Array.isArray(needles)) {
      needles = [needles]
    }

    for (let needle of needles) {
      if (ignoreCase) {
        needle = needle.toLowerCase()
      }

      if (needle !== '' && haystack.includes(needle)) {
        return true
      }
    }

    return false
  }
}
