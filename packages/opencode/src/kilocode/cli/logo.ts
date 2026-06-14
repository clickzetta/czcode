// kilocode_change - new file
// czcode_change — replaced KILO block art with clean text branding

const logo = {
  tui: ["", "", ""],
  plain: ["", "", ""],
  exit: ["  ", "  ", "  "],
}

export function supports(_env = process.env, _platform = process.platform) {
  return true
}

export function tui(_env = process.env, _platform = process.platform) {
  return logo.tui
}

export function plain(_env = process.env, _platform = process.platform) {
  return logo.plain
}

export function session(
  title: string,
  id: string | undefined,
  dim: string,
  normal: string,
  _env = process.env,
  _platform = process.platform,
) {
  return [``, `${logo.exit[0]}${dim}${title}${normal}`, `${logo.exit[1]}${dim}czcode -s ${id}${normal}`, logo.exit[2]].join("\n")
}
