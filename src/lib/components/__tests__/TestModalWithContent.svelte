<script lang="ts">
import BaseModal from '../BaseModal.svelte';

interface Props {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
}

let { isOpen, onClose, title = 'Test Modal' }: Props = $props();
</script>

<BaseModal {isOpen} {onClose} {title}>
  <div>Modal Content</div>
</BaseModal>
