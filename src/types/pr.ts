export interface PullRequest {
  number: number
  title: string
  author: string
  url: string
  repo: string
  updatedAt: string
  diff: string
  files: string[]
  headSha: string
}
