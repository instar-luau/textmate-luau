declare extern type Widget extends Parent with
  read name: string
  write [string]: number
  read ["label"]: string
  with: boolean
  read read: () -> ()
  @checked function get(self): number
end
local result = Widget
