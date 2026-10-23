export class Child extends package.Base
  public value: number
  public function get(self): number
    if self.value then
      return self.value
    end
  end
  public public: number
end
local value = Child
