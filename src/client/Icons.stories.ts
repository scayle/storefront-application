const icons = import.meta.glob('./assets/icons/**/*.svg', { eager: true })

const mappedIcons: Record<string, unknown> = {}

for (const [path, component] of Object.entries(icons)) {
  const regex = /\.\/assets\/icons\/([^/]+)\/([^/]+)\.svg$/
  const match = regex.exec(path)
  if (match) {
    const group = match[1]!.toLowerCase()
    const name = match[2]!.toLowerCase()
    const key = `${group}-${name}`
    mappedIcons[key] = component
  }
}

export default {
  title: 'Assets/Icons',
  // No component to describe, so the components manifest has nothing to list.
  tags: ['!manifest'],
  parameters: {
    docs: {
      description: {
        component:
          'All available icons in the application. Icons are auto-imported and can be used directly as Vue components.',
      },
    },
  },
}

/** Every icon under `assets/icons/`, grouped by folder. */
export const AllIcons = {
  render: (args: Record<string, unknown>) => ({
    components: mappedIcons,
    setup() {
      const groups = [
        'availability',
        'checkmark',
        'commerce',
        'increment',
        'input',
        'logo',
        'navigation',
        'notify',
        'payment',
        'user',
        'utility',
      ]

      // Create a lowercase set of group names for easy comparison
      const groupSet = new Set(groups.map((g) => g.toLowerCase()))

      // Sort components into a group-to-component-list mapping
      const componentsByGroup: Record<
        string,
        { component: string; fileName: string }[]
      > = {}

      for (const group of groups) {
        componentsByGroup[group] = []
      }
      componentsByGroup.other = []

      for (const [name] of Object.entries(mappedIcons)) {
        // Extract the group: IconAvailabilityCheck → 'availability'
        const [groupName, fileName] = name.split('-')

        if (groupName && groupSet.has(groupName)) {
          componentsByGroup[groupName]?.push({
            component: name,
            fileName: `${groupName}/${fileName}.svg`,
          })
        } else {
          componentsByGroup.other.push({
            component: name,
            fileName: `${groupName}/${fileName}.svg`,
          })
        }
      }

      return { args, componentsByGroup }
    },
    template: `
     <div>
       <div v-for="(icons, group) in componentsByGroup" :key="group" class="mb-8">
          <h3 class="text-lg font-semibold mb-3 capitalize">
            {{ group }}
          </h3>
          <div class="grid grid-cols-2 gap-6">
            <div
              v-for="icon in icons"
              :key="icon.component"
              class="flex flex-col items-center justify-center border-2 border-gray-200 rounded-lg p-4 shrink-0"
            >
              <component :is="icon.component" class="size-8 mb-2" />
              <code class="text-sm text-secondary">
                &lt;script lang="ts" setup&gt;<br />
                &nbsp;&nbsp;&nbsp;&nbsp;import {{ icon.component }} from '@assets/icons/{{ icon.fileName }}'<br />
                &lt;/script&gt;<br />
                &lt;template&gt;<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&lt;{{ icon.component }} /&gt;<br />
                &lt;/template&gt;<br />
              </code>
            </div>
          </div>
        </div>
      </div>
    `,
  }),
}
