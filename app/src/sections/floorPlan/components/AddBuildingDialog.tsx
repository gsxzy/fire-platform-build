import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Building2, Loader2 } from 'lucide-react';

interface AddBuildingDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
  onNameChange: (v: string) => void;
  type: string;
  onTypeChange: (v: string) => void;
  totalFloors: number;
  onTotalFloorsChange: (v: number) => void;
  address: string;
  onAddressChange: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
}

export default function AddBuildingDialog({
  open, onOpenChange,
  name, onNameChange,
  type, onTypeChange,
  totalFloors, onTotalFloorsChange,
  address, onAddressChange,
  loading, onSubmit,
}: AddBuildingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-600 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-100 flex items-center gap-2 text-base">
            <Building2 className="w-5 h-5 text-blue-400 shrink-0" />
            新建建筑
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            将归入当前所选单位。创建后请在本页选择该建筑，再添加楼层与平面图。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="fp-new-building-name" className="text-slate-400 text-xs">建筑名称 *</Label>
            <Input
              id="fp-new-building-name"
              value={name}
              onChange={e => onNameChange(e.target.value)}
              placeholder="例如：1号楼、主楼"
              className="h-9 text-sm bg-slate-900/80 border-slate-600 text-slate-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fp-new-building-type" className="text-slate-400 text-xs">建筑类型</Label>
              <Input
                id="fp-new-building-type"
                value={type}
                onChange={e => onTypeChange(e.target.value)}
                placeholder="商业 / 住宅…"
                className="h-9 text-sm bg-slate-900/80 border-slate-600 text-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-new-building-floors" className="text-slate-400 text-xs">地上层数</Label>
              <Input
                id="fp-new-building-floors"
                type="number"
                min={1}
                value={totalFloors}
                onChange={e => onTotalFloorsChange(Number(e.target.value) || 1)}
                className="h-9 text-sm bg-slate-900/80 border-slate-600 text-slate-200"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fp-new-building-address" className="text-slate-400 text-xs">地址（选填）</Label>
            <Input
              id="fp-new-building-address"
              value={address}
              onChange={e => onAddressChange(e.target.value)}
              placeholder="建筑地址或备注位置"
              className="h-9 text-sm bg-slate-900/80 border-slate-600 text-slate-200"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="border-slate-600 text-slate-300"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 inline-flex items-center gap-2"
            onClick={() => void onSubmit()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                创建中…
              </>
            ) : (
              '创建'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
