variable "name" {
  description = "Prefix for resource names"
  type        = string
  default     = "holotekt-ds"
}

variable "domain_name" {
  description = "Hostname to serve from. Empty means the CloudFront default address."
  type        = string
  default     = "designsystem.holotekt.com"
}

variable "zone_name" {
  description = "Existing Route 53 hosted zone for domain_name; needed only when a domain is set"
  type        = string
  default     = "holotekt.com"
}

variable "github_repo" {
  description = "owner/name of the repository allowed to deploy"
  type        = string
  default     = "august-holo/holotekt-design-system"
}

variable "github_branch" {
  type    = string
  default = "main"
}

# GitHub's OIDC subject names the owner and repository by id as well as by name
# (repo:owner@id/name@id:ref:...). Both are public; see the GitHub API.
variable "github_owner_id" {
  type    = number
  default = 175449501
}

variable "github_repo_id" {
  type    = number
  default = 1469401451
}
