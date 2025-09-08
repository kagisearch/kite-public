<script lang="ts">
  import BaseModal from "../BaseModal.svelte";

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
  }

  // biome-ignore lint/style/useConst: Svelte props must remain let to stay reactive
  let { isOpen, onClose, title = "Test Modal" }: Props = $props();
</script>

<BaseModal {isOpen} {onClose} {title}>
  <div>Modal Content</div>
</BaseModal>
